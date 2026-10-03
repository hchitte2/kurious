/**
 * Card records, read and written AS THE APP (owner identity, X-App-Action:
 * RBAC off). This is the only writer of `cards`; clients only read their own.
 *
 * Same wire call as `buildCronContext(env, env.OWNER_USER_ID,
 * \`app:${env.DEEPSPACE_APP_ID}\`).records`, but through ActionTools so we
 * also get `get`, ordered `query`, and a caller-chosen record id.
 */

import { RECORD_NOT_FOUND } from 'deepspace/worker'
import type { ActionResult, ActionTools } from 'deepspace/worker'
import { CARDS_COLLECTION, toCardData, type CardData } from '../shared/card'
import { createActionTools } from '../server/action-routes.js'
import type { Env } from '../../worker.js'

/** A `cards` record envelope with normalized data (fits `toCardView`). */
export interface CardRecord {
  recordId: string
  data: CardData
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface RawRecord {
  recordId: string
  data: Record<string, unknown>
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** Record + integration tools acting as the app owner (owner-billed). */
export function appTools(env: Env): ActionTools {
  return createActionTools(env, env.OWNER_USER_ID, env.APP_OWNER_JWT)
}

export function unwrap<T>(result: ActionResult<T>, what: string): T {
  if (!result.success) throw new Error(`${what} failed: ${result.error}`)
  return result.data
}

export async function getCard(tools: ActionTools, cardId: string): Promise<CardRecord | null> {
  const result = await tools.get(CARDS_COLLECTION, cardId)
  if (!result.success) {
    if (result.error === RECORD_NOT_FOUND) return null
    throw new Error(`cards.get failed: ${result.error}`)
  }
  return toCardRecord(result.data.record)
}

export async function createCard(tools: ActionTools, cardId: string, data: CardData): Promise<void> {
  unwrap(await tools.create(CARDS_COLLECTION, { ...data }, cardId), 'cards.create')
}

/** Merges `patch` into the card (server-side merge) and bumps `updatedAt`. */
export async function updateCard(
  tools: ActionTools,
  cardId: string,
  patch: Partial<CardData>,
): Promise<void> {
  unwrap(await tools.update(CARDS_COLLECTION, cardId, { ...patch }), 'cards.update')
}

/** Equality-only filters (the record room's `where` has no ranges). */
export type CardWhere = Partial<Pick<CardData, 'normalizedQuestion' | 'ageBand' | 'status' | 'wall' | 'ownerId'>>

export async function queryCards(
  tools: ActionTools,
  where: CardWhere,
  limit: number,
): Promise<CardRecord[]> {
  const data = unwrap(
    await tools.query(CARDS_COLLECTION, { where: { ...where }, orderBy: 'createdAt', orderDir: 'desc', limit }),
    'cards.query',
  )
  return data.records.map(toCardRecord)
}

// ── Normalizing what the record room hands back ─────────────────────────────
// The room omits NULL columns on read, and JSON columns come back parsed but
// untyped, so every field is checked and defaulted here.

function toCardRecord(record: RawRecord): CardRecord {
  return {
    recordId: record.recordId,
    data: toCardData(record.data),
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}


