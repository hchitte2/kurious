/**
 * Kurious card routes (contract: src/shared/card.ts).
 *
 *   POST /api/ask                 signed in  -> reuse a checked card for free, or
 *                                               count against the caps, create, enqueue
 *   POST /api/cards/:id/retry     owner      -> re-run an errored / stale card (counts)
 *   GET  /api/wall                public     -> WallPage of public cards, newest first
 *   GET  /api/cards/:id           public     -> PublicCardResponse (404 unless public)
 *
 * Signed-in routes take `Authorization: Bearer <jwt>` (client: `getAuthToken()`
 * from 'deepspace'). Public routes only ever return CardView, so ownerId,
 * safety and errorMessage never leave the worker.
 */

import type { Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { enqueueJob, isAnonymousUserId, mintUlid } from 'deepspace/worker'
import type { ActionTools } from 'deepspace/worker'
import {
  ASK_ROUTE,
  isAgeBand,
  isStale,
  newCardData,
  normalizeQuestion,
  QUESTION_MAX_CHARS,
  QUESTION_MIN_CHARS,
  toCardView,
  WALL_ROUTE,
  type AgeBand,
  type AskErrorCode,
  type CardView,
  type AskResponse,
  type CardData,
  type PublicCardResponse,
  type WallPage,
} from '../shared/card'
import { MAKE_CARD_JOB } from '../worker/make-card.js'
import { appTools, createCard, getCard, queryCards, updateCard, type CardRecord } from '../worker/records.js'
import { releaseCard, remainingToday, reserveCard, type Reservation } from '../worker/usage.js'
import { shortMessage } from '../worker/retry.js'
import type { AppContext, Env } from '../../worker.js'
import { resolveAuth } from './http-routes.js'

type Ctx = Context<AppContext>

/** Errors for the ask and retry routes. */
type RetryErrorCode = AskErrorCode

function fail(c: Ctx, status: ContentfulStatusCode, error: RetryErrorCode, message: string) {
  return c.json({ ok: false as const, error, message }, status)
}

async function signedInUser(c: Ctx): Promise<string | null> {
  const auth = await resolveAuth(c.req.raw, c.env)
  if (!auth || isAnonymousUserId(auth.userId)) return null
  return auth.userId
}

function capMessage(reservation: Extract<Reservation, { ok: false }>): string {
  return reservation.scope === 'user'
    ? 'Daily question limit reached for this account. It resets at midnight UTC.'
    : 'Kurious has answered all the questions it can for today. It resets at midnight UTC.'
}

async function startJob(env: Env, roomId: string, cardId: string, userId: string): Promise<void> {
  await enqueueJob(env.JOB_ROOMS, roomId, MAKE_CARD_JOB, { cardId }, { maxAttempts: 1, enqueuedBy: userId })
}

// ── Ask ─────────────────────────────────────────────────────────────────────

interface AskInput {
  question: string
  ageBand: AgeBand
  parentCardId: string | null
}

function parseAsk(body: unknown): AskInput | null {
  if (typeof body !== 'object' || body === null) return null
  const { question, ageBand, parentCardId } = body as Record<string, unknown>
  if (typeof question !== 'string' || !isAgeBand(ageBand)) return null
  const trimmed = question.trim()
  if (trimmed.length < QUESTION_MIN_CHARS || trimmed.length > QUESTION_MAX_CHARS) return null
  if (!normalizeQuestion(trimmed)) return null
  if (parentCardId !== undefined && parentCardId !== null && typeof parentCardId !== 'string') return null
  return { question: trimmed, ageBand, parentCardId: parentCardId ? parentCardId : null }
}

type Lineage = Pick<CardData, 'parentCardId' | 'rootCardId' | 'trail'>

function lineageFrom(parent: CardRecord | null): Lineage {
  if (!parent) return { parentCardId: null, rootCardId: null, trail: [] }
  return {
    parentCardId: parent.recordId,
    rootCardId: parent.data.rootCardId ?? parent.recordId,
    trail: [...parent.data.trail, { cardId: parent.recordId, question: parent.data.question }],
  }
}

/** P1 exact reuse: a ready, checked card with the same question + age band that the caller may see. */
async function findReusable(
  tools: ActionTools,
  userId: string,
  normalizedQuestion: string,
  ageBand: AgeBand,
): Promise<CardRecord | null> {
  const candidates = await queryCards(tools, { normalizedQuestion, ageBand, status: 'ready' }, 25)
  return (
    candidates.find(
      (card) =>
        card.data.check?.verdict === 'pass' &&
        Boolean(card.data.paragraph) &&
        (card.data.ownerId === userId || card.data.wall === 'public'),
    ) ?? null
  )
}

/**
 * What signed-out visitors see. The trail is dropped: earlier stops can be
 * private cards whose questions hold personal details (names, schools).
 */
function toPublicView(card: CardRecord): CardView {
  return { ...toCardView(card), trail: [] }
}

function reusedCopy(source: CardRecord, userId: string, input: AskInput, lineage: Lineage): CardData {
  const s = source.data
  return {
    // The source's question, not the asker's raw text: only the source's wording
    // was safety-checked, and a public copy shows it on its share link.
    ...newCardData({ ownerId: userId, question: s.question, ageBand: input.ageBand, ...lineage }),
    status: 'ready',
    paragraph: s.paragraph,
    keyIdea: s.keyIdea,
    followUps: s.followUps,
    imagePrompt: s.imagePrompt,
    imageUrl: s.imageUrl,
    audioUrl: s.audioUrl,
    safety: s.safety,
    check: s.check,
    writerModel: s.writerModel,
    reusedFromCardId: s.reusedFromCardId ?? source.recordId,
    wall: s.wall === 'public' ? 'public' : 'private',
  }
}

async function readJson(c: Ctx): Promise<unknown> {
  try {
    const text = await c.req.text()
    return text.length > 8_192 ? null : (JSON.parse(text) as unknown)
  } catch {
    return null
  }
}

// ── Wall ────────────────────────────────────────────────────────────────────

export const WALL_DEFAULT_LIMIT = 12
const WALL_MAX_LIMIT = 30
/** The record room filters by equality only, so the Wall pages in memory over this many newest rows. */
const WALL_SCAN_LIMIT = 500

/** Opaque to the client: `<createdAt>~<recordId>` of the last card on the page. */
const cursorOf = (card: CardRecord) => `${card.createdAt}~${card.recordId}`

interface WallCursor {
  createdAt: string
  recordId: string
}

function parseCursor(raw: string): WallCursor | null {
  const at = raw.indexOf('~')
  return at > 0 ? { createdAt: raw.slice(0, at), recordId: raw.slice(at + 1) } : null
}

/** Sorts after the cursor in newest-first order (ISO timestamps compare as strings). */
const olderThan = (card: CardRecord, cursor: WallCursor) =>
  card.createdAt < cursor.createdAt || (card.createdAt === cursor.createdAt && card.recordId < cursor.recordId)

function newestFirst(a: CardRecord, b: CardRecord): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
  return a.recordId < b.recordId ? 1 : a.recordId > b.recordId ? -1 : 0
}

function parseLimit(raw: string | undefined): number {
  const value = Number(raw)
  if (!raw || !Number.isFinite(value)) return WALL_DEFAULT_LIMIT
  return Math.min(WALL_MAX_LIMIT, Math.max(1, Math.floor(value)))
}

const isPublicCard = (card: CardRecord) => card.data.wall === 'public' && card.data.status === 'ready'

/**
 * One page of the Wall, newest first, after `cursor`. Shared by GET /api/wall
 * and the `wall_list` agent tool so both apply the same rules. Throws on a
 * record-room failure.
 */
export async function readWallPage(env: Env, cursor: string | null, limit: number): Promise<WallPage> {
  const rows = await queryCards(appTools(env), { wall: 'public', status: 'ready' }, WALL_SCAN_LIMIT)
  // Reused copies repeat their source's content: keep them off the Wall.
  const cards = rows.filter((card) => isPublicCard(card) && !card.data.reusedFromCardId).sort(newestFirst)
  const after = cursor ? parseCursor(cursor) : null
  const start = after ? cards.findIndex((card) => olderThan(card, after)) : 0
  const from = start < 0 ? cards.length : start
  const page = cards.slice(from, from + limit)
  const more = from + limit < cards.length
  return {
    items: page.map(toPublicView),
    nextCursor: more && page.length > 0 ? cursorOf(page[page.length - 1]) : null,
  }
}

/**
 * A shared card as signed-out visitors see it, or null unless it is public
 * and ready. Shared by GET /api/cards/:id and the `card_get` agent tool.
 */
export async function readPublicCard(env: Env, cardId: string): Promise<CardView | null> {
  const card = await getCard(appTools(env), cardId)
  return card && isPublicCard(card) ? toPublicView(card) : null
}

// ── Routes ──────────────────────────────────────────────────────────────────

export function registerCardRoutes(app: Hono<AppContext>): void {
  app.post(ASK_ROUTE, async (c) => {
    const userId = await signedInUser(c)
    if (!userId) return fail(c, 401, 'unauthenticated', 'Sign in to ask a question.')

    const input = parseAsk(await readJson(c))
    if (!input) {
      return fail(
        c,
        400,
        'invalid_question',
        `Send { question (${QUESTION_MIN_CHARS}-${QUESTION_MAX_CHARS} characters), ageBand, parentCardId? }.`,
      )
    }

    const tools = appTools(c.env)
    try {
      let parent: CardRecord | null = null
      if (input.parentCardId) {
        parent = await getCard(tools, input.parentCardId)
        if (!parent || parent.data.ownerId !== userId) {
          return fail(c, 404, 'parent_not_found', 'That card is not one of yours.')
        }
      }
      const lineage = lineageFrom(parent)

      // P1: exact reuse is free and doesn't count toward the cap.
      const source = await findReusable(tools, userId, normalizeQuestion(input.question), input.ageBand)
      if (source) {
        const cardId = mintUlid()
        await createCard(tools, cardId, reusedCopy(source, userId, input, lineage))
        console.info(`[ask] caller=${userId} card=${cardId} reused=${source.recordId}`)
        const response: AskResponse = { ok: true, cardId, reused: true, remainingToday: await remainingToday(tools, userId) }
        return c.json(response)
      }

      const cardId = mintUlid()
      const reservation = await reserveCard(tools, userId, cardId, 'ask')
      if (!reservation.ok) return fail(c, 429, 'daily_cap_reached', capMessage(reservation))

      try {
        await createCard(
          tools,
          cardId,
          newCardData({ ownerId: userId, question: input.question, ageBand: input.ageBand, ...lineage }),
        )
      } catch (err) {
        await releaseCard(tools, reservation.usageId)
        throw err
      }
      try {
        await startJob(c.env, `card:${cardId}`, cardId, userId)
      } catch (err) {
        await releaseCard(tools, reservation.usageId)
        await updateCard(tools, cardId, { status: 'error', errorMessage: `enqueue: ${shortMessage(err, 120)}` }).catch(
          () => undefined,
        )
        throw err
      }
      console.info(`[ask] caller=${userId} card=${cardId} new`)
      const response: AskResponse = { ok: true, cardId, reused: false, remainingToday: reservation.remainingToday }
      return c.json(response)
    } catch (err) {
      console.error(`[ask] caller=${userId} failed: ${shortMessage(err)}`)
      return fail(c, 500, 'server_error', 'Something went wrong starting that card. Try again.')
    }
  })

  app.post('/api/cards/:id/retry', async (c) => {
    const userId = await signedInUser(c)
    if (!userId) return fail(c, 401, 'unauthenticated', 'Sign in to retry a card.')

    const cardId = c.req.param('id')
    const tools = appTools(c.env)
    try {
      const card = await getCard(tools, cardId)
      if (!card || card.data.ownerId !== userId) return fail(c, 404, 'not_found', 'No such card.')
      const retryable =
        card.data.status === 'error' || isStale({ status: card.data.status, updatedAt: card.updatedAt })
      if (!retryable) return fail(c, 409, 'not_retryable', 'This card is not stuck or failed.')

      const reservation = await reserveCard(tools, userId, cardId, 'retry')
      if (!reservation.ok) return fail(c, 429, 'daily_cap_reached', capMessage(reservation))

      try {
        // Keep the content: the job skips every stage whose output is saved.
        await updateCard(tools, cardId, { status: 'queued', errorMessage: null })
        // A fresh room: a crashed run can hold `card:<id>` for ~16 minutes (spike S4).
        await startJob(c.env, `card:${cardId}:retry:${Date.now()}`, cardId, userId)
      } catch (err) {
        await releaseCard(tools, reservation.usageId)
        await updateCard(tools, cardId, { status: 'error', errorMessage: `retry: ${shortMessage(err, 120)}` }).catch(
          () => undefined,
        )
        throw err
      }
      console.info(`[retry] caller=${userId} card=${cardId}`)
      const response: AskResponse = { ok: true, cardId, reused: false, remainingToday: reservation.remainingToday }
      return c.json(response)
    } catch (err) {
      console.error(`[retry] caller=${userId} card=${cardId} failed: ${shortMessage(err)}`)
      return fail(c, 500, 'server_error', 'Something went wrong retrying that card. Try again.')
    }
  })

  app.get(WALL_ROUTE, async (c) => {
    const limit = parseLimit(c.req.query('limit'))
    const cursor = c.req.query('cursor') ?? null
    try {
      const body: WallPage = await readWallPage(c.env, cursor, limit)
      c.header('Cache-Control', 'public, max-age=15')
      return c.json(body)
    } catch (err) {
      console.error(`[wall] failed: ${shortMessage(err)}`)
      return c.json({ error: 'server_error' }, 500)
    }
  })

  app.get('/api/cards/:id', async (c) => {
    const notFound: PublicCardResponse = { ok: false, error: 'not_found' }
    try {
      const card = await readPublicCard(c.env, c.req.param('id'))
      if (!card) return c.json(notFound, 404)
      const body: PublicCardResponse = { ok: true, card }
      c.header('Cache-Control', 'public, max-age=60')
      return c.json(body)
    } catch (err) {
      console.error(`[card] failed: ${shortMessage(err)}`)
      return c.json({ error: 'server_error' }, 500)
    }
  })
}
