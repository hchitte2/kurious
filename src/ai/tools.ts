/**
 * Kurious agent tools: the ONE tool definition, registered once in worker.ts
 * with `registerAgent(app, { tools: buildTools, inApp: false })`. A local
 * agent (Claude Code, Codex...) reaches them through the DeepSpace CLI:
 *
 *   npx deepspace agent tools kurious --json
 *   npx deepspace agent invoke kurious <tool> --input '<json>' --json
 *
 * Every tool is FREE and READ-ONLY. None starts or retries a card, so none can
 * spend the owner's credits; asking stays on POST /api/ask behind sign-in and
 * the daily caps.
 *
 * Cards and usage rows are worker-only records, so these tools read AS THE APP
 * and each applies its own rule: `wall_list` / `card_get` return exactly what
 * the public routes return (src/server/card-routes.ts), and `my_cards` /
 * `usage_today` filter by the caller's id, which comes only from the agent
 * token registerAgent verified (src/ai/agent.ts), never from tool input.
 */

import { tool } from 'ai'
import type { ToolSet } from 'ai'
import { z } from 'zod'
import { DEFAULT_CONTEXT_CONFIG, isAnonymousUserId } from 'deepspace/worker'
import type { CollectionSchema } from 'deepspace/worker'
import { isStale, toCardView, type CardCheck, type CardView, type PublicCardResponse, type WallPage } from '../shared/card'
import { readPublicCard, readWallPage, WALL_DEFAULT_LIMIT } from '../server/card-routes.js'
import { appTools, queryCards } from '../worker/records.js'
import { shortMessage } from '../worker/retry.js'
import { usageToday, type UsageToday } from '../worker/usage.js'
import type { Env } from '../../worker.js'

export type ToolExecutor = (toolName: string, params: Record<string, unknown>) => Promise<unknown>

/** Who is calling, for one tool request. Supplied by registerAgent after it verifies the agent token. */
export interface ToolCaller {
  env: Env
  /** From the verified agent token; never from tool input. */
  userId: string
}

const MY_CARDS_DEFAULT_LIMIT = 10
const MY_CARDS_MAX_LIMIT = 25

/**
 * The SDK refuses a tool result over `toolResultCap` bytes (30 KB) with
 * `tool_result_too_large`. Keep a margin: my_cards drops its oldest cards to
 * fit. wall_list stays well under by capping its page at the Wall's 12.
 */
const RESULT_BUDGET_BYTES = DEFAULT_CONTEXT_CONFIG.toolResultCap - 2_000

// ── Result shapes ───────────────────────────────────────────────────────────

type Unauthenticated = { ok: false; error: 'unauthenticated'; message: string }

/** One of the caller's own cards, with what a grown-up needs to debug it. */
export interface MyCard extends CardView {
  /** Still generating long after its last update: treat as failed (it can be retried in the app). */
  stale: boolean
  /** The cross-provider checker's verdict. Null until the checker has run. */
  check: Pick<CardCheck, 'verdict' | 'issues'> | null
  /** Short reason the card failed or was declined. Null when it didn't. */
  errorMessage: string | null
}

export type MyCardsResult = { ok: true; cards: MyCard[]; truncated: boolean } | Unauthenticated
export type UsageTodayResult = ({ ok: true } & UsageToday) | Unauthenticated

const UNAUTHENTICATED: Unauthenticated = {
  ok: false,
  error: 'unauthenticated',
  message: 'This tool needs a signed-in DeepSpace account. Run `npx deepspace auth login`, then retry.',
}

// ── Tools ───────────────────────────────────────────────────────────────────

/**
 * `executor` (the SDK's RBAC-scoped record executor) is unused: cards and
 * usage are worker-only records read as the app with explicit per-caller
 * filters. `caller` is optional only so the scaffold's unused in-app chat
 * (src/ai/chat-routes.ts) still type-checks; without it there are no tools.
 */
export function buildTools(_executor: ToolExecutor, caller?: ToolCaller): ToolSet {
  if (!caller) return {}
  const { env, userId } = caller

  return {
    wall_list: tool({
      description:
        "List the public Wall of Kurious cards, newest first: the same page GET /api/wall returns. Each card answers a kid's \"why?\" question with one picture (imageUrl), one short paragraph (also read aloud: audioUrl), a keyIdea and 2-3 \"But why?\" followUps. Only ready, public cards appear; reused copies are left out. Returns { items: CardView[], nextCursor }. To page, pass nextCursor back as cursor; null means no more. Free and read-only.",
      inputSchema: z.object({
        cursor: z
          .string()
          .min(1)
          .max(200)
          .optional()
          .describe('The nextCursor from the previous page. Omit for the newest cards.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(WALL_DEFAULT_LIMIT)
          .optional()
          .describe(`Cards per page, 1-${WALL_DEFAULT_LIMIT}. Default ${WALL_DEFAULT_LIMIT}.`),
      }),
      execute: ({ cursor, limit }): Promise<WallPage> =>
        logged('wall_list', userId, () => readWallPage(env, cursor ?? null, limit ?? WALL_DEFAULT_LIMIT)),
    }),

    card_get: tool({
      description:
        'Get one public Kurious card by id: the same answer GET /api/cards/:id gives a share link. Returns { ok: true, card: CardView } for a ready, public card, otherwise { ok: false, error: "not_found" } (private, still generating, declined, failed, or no such id; they are indistinguishable on purpose). For your own private cards use my_cards. Free and read-only.',
      inputSchema: z.object({
        cardId: z.string().trim().min(1).max(64).describe('The card id, e.g. from wall_list items[].id or a /c/<id> share link.'),
      }),
      execute: ({ cardId }): Promise<PublicCardResponse> =>
        logged('card_get', userId, async () => {
          const card = await readPublicCard(env, cardId)
          return card ? { ok: true, card } : { ok: false, error: 'not_found' }
        }),
    }),

    my_cards: tool({
      description:
        "List the CALLER's own Kurious cards, newest first, including private, generating, declined and failed ones. Meant for a grown-up debugging their own cards. Each item is a CardView (status: queued | writing | checking | illustrating | ready | declined | error) plus stale (stuck generating; retry it in the app), check ({ verdict: pass | fail, issues } from the fact checker, or null) and errorMessage. Returns { ok: true, cards, truncated }; truncated means older cards were dropped to fit the response size, so ask for fewer. Never returns anyone else's cards. Needs a signed-in account. Free and read-only: it never starts or retries a card.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(MY_CARDS_MAX_LIMIT)
          .optional()
          .describe(`How many of your newest cards, 1-${MY_CARDS_MAX_LIMIT}. Default ${MY_CARDS_DEFAULT_LIMIT}.`),
      }),
      execute: ({ limit }): Promise<MyCardsResult> =>
        logged('my_cards', userId, async () => {
          if (isAnonymousUserId(userId)) return UNAUTHENTICATED
          const records = await queryCards(appTools(env), { ownerId: userId }, limit ?? MY_CARDS_DEFAULT_LIMIT)
          const now = Date.now()
          const cards = records
            // The query already filters by owner; this re-check keeps the guarantee local.
            .filter((card) => card.data.ownerId === userId)
            .map(
              (card): MyCard => ({
                ...toCardView(card),
                stale: isStale({ status: card.data.status, updatedAt: card.updatedAt }, now),
                check: card.data.check ? { verdict: card.data.check.verdict, issues: card.data.check.issues } : null,
                errorMessage: card.data.errorMessage,
              }),
            )
          const fitted = fitBudget(cards, (items) => ({ ok: true, cards: items, truncated: false }))
          return { ok: true, cards: fitted, truncated: fitted.length < cards.length }
        }),
    }),

    usage_today: tool({
      description:
        "The CALLER's Kurious question allowance for today (UTC). Each new card counts once against a per-account daily limit and a global daily limit shared by everyone; reused answers are free and do not count. Returns { ok: true, day, resetsAt, used, remaining, limit, globalRemaining, globalLimit, canAskNow }. Needs a signed-in account. Free and read-only: counts nothing.",
      inputSchema: z.object({}),
      execute: (): Promise<UsageTodayResult> =>
        logged('usage_today', userId, async () => {
          if (isAnonymousUserId(userId)) return UNAUTHENTICATED
          return { ok: true, ...(await usageToday(appTools(env), userId)) }
        }),
    }),
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Logs the call and any failure (the SDK answers a throw with a bare 500), then rethrows. */
async function logged<T>(name: string, userId: string, run: () => Promise<T>): Promise<T> {
  try {
    const result = await run()
    console.info(`[agent-tool] ${name} caller=${userId}`)
    return result
  } catch (err) {
    console.error(`[agent-tool] ${name} caller=${userId} failed: ${shortMessage(err)}`)
    throw err
  }
}

const encoder = new TextEncoder()

/** Drops items from the end until `wrap(items)` serializes within the tool result budget. */
function fitBudget<T>(items: T[], wrap: (items: T[]) => unknown): T[] {
  let kept = items
  while (kept.length > 0 && encoder.encode(JSON.stringify(wrap(kept))).length > RESULT_BUDGET_BYTES) {
    kept = kept.slice(0, -1)
  }
  return kept
}

// ============================================================================
// In-app assistant system prompt (scaffold). Only src/ai/chat-routes.ts uses
// it, and Kurious does not enable the in-app chat surface.
// ============================================================================

type Interpretation = CollectionSchema['columns'][number]['interpretation']

function interpretationLabel(interpretation: Interpretation): string {
  if (typeof interpretation === 'string') return interpretation
  const kind = interpretation.kind
  return typeof kind === 'string' ? kind : 'object'
}

export function buildSystemPrompt(appName: string, schemas: CollectionSchema[]): string {
  const schemaSummary = schemas
    .map((s) => {
      const cols = (s.columns ?? [])
        .map((c) => `${c.name}:${interpretationLabel(c.interpretation)}${c.required ? '!' : ''}`)
        .join(', ')
      return `- ${s.name}${cols ? ` (${cols})` : ''}`
    })
    .join('\n')

  return [
    `You are the assistant for the "${appName}" app on DeepSpace.`,
    'Your tools are read-only. Use them to look up facts before answering.',
    'Do not invent data. If data is missing, say so plainly. Keep answers concise.',
    '',
    'Available collections:',
    schemaSummary || '(none)',
  ].join('\n')
}
