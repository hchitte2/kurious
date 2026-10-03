/**
 * Daily caps on paid cards: DAILY_CARD_CAP per user and GLOBAL_DAILY_CARD_CAP
 * across everyone, per UTC day. Reused cards are free and never call this.
 *
 * Insert-then-count over an append-only log (src/schemas/usage-schema.ts):
 * concurrent asks can only be refused at the boundary, never slip past it.
 */

import { mintUlid } from 'deepspace/worker'
import type { ActionTools } from 'deepspace/worker'
import { DAILY_CARD_CAP, GLOBAL_DAILY_CARD_CAP } from '../config'
import { USAGE_COLLECTION } from '../schemas/usage-schema'
import { unwrap } from './records.js'

export type UsageKind = 'ask' | 'retry'

export type Reservation =
  | { ok: true; usageId: string; remainingToday: number }
  | { ok: false; scope: 'user' | 'global'; remainingToday: number }

/** UTC day, YYYY-MM-DD. */
export function utcDay(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

async function countRows(tools: ActionTools, where: Record<string, string>, atMost: number): Promise<number> {
  const data = unwrap(await tools.query(USAGE_COLLECTION, { where, limit: atMost }), 'usage.query')
  return data.records.length
}

const remaining = (used: number) => Math.max(0, DAILY_CARD_CAP - used)

/** Paid cards this user can still ask for today. */
export async function remainingToday(tools: ActionTools, userId: string): Promise<number> {
  return remaining(await countRows(tools, { userId, day: utcDay() }, DAILY_CARD_CAP + 1))
}

export interface UsageToday {
  /** UTC day the counts are for, YYYY-MM-DD. */
  day: string
  /** When both caps reset: the next UTC midnight, ISO 8601. */
  resetsAt: string
  /** Paid cards this user has used today (reused cards are free and not counted). */
  used: number
  /** Paid cards this user can still ask for today, ignoring the global cap. */
  remaining: number
  limit: number
  /** Paid cards left today across everyone. */
  globalRemaining: number
  globalLimit: number
  /** Whether a new (paid) question would be accepted right now: both caps have room. */
  canAskNow: boolean
}

/** Read-only snapshot of both caps for one user. Counts nothing. */
export async function usageToday(tools: ActionTools, userId: string, now = Date.now()): Promise<UsageToday> {
  const day = utcDay(now)
  const [mine, everyone] = await Promise.all([
    countRows(tools, { userId, day }, DAILY_CARD_CAP + 1),
    countRows(tools, { day }, GLOBAL_DAILY_CARD_CAP + 1),
  ])
  const globalRemaining = Math.max(0, GLOBAL_DAILY_CARD_CAP - everyone)
  return {
    day,
    resetsAt: `${utcDay(Date.parse(`${day}T00:00:00Z`) + 86_400_000)}T00:00:00.000Z`,
    used: Math.min(mine, DAILY_CARD_CAP),
    remaining: remaining(mine),
    limit: DAILY_CARD_CAP,
    globalRemaining,
    globalLimit: GLOBAL_DAILY_CARD_CAP,
    canAskNow: remaining(mine) > 0 && globalRemaining > 0,
  }
}

/** Count one paid card against both caps, or refuse it (nothing is counted then). */
export async function reserveCard(
  tools: ActionTools,
  userId: string,
  cardId: string,
  kind: UsageKind,
): Promise<Reservation> {
  const day = utcDay()
  const usageId = `u_${mintUlid()}`
  unwrap(await tools.create(USAGE_COLLECTION, { userId, day, cardId, kind }, usageId), 'usage.create')

  const [mine, everyone] = await Promise.all([
    countRows(tools, { userId, day }, DAILY_CARD_CAP + 1),
    countRows(tools, { day }, GLOBAL_DAILY_CARD_CAP + 1),
  ])
  if (mine > DAILY_CARD_CAP || everyone > GLOBAL_DAILY_CARD_CAP) {
    await releaseCard(tools, usageId)
    return {
      ok: false,
      scope: mine > DAILY_CARD_CAP ? 'user' : 'global',
      remainingToday: mine > DAILY_CARD_CAP ? 0 : remaining(mine - 1),
    }
  }
  return { ok: true, usageId, remainingToday: remaining(mine) }
}

/** Undo a reservation (the card was never started). */
export async function releaseCard(tools: ActionTools, usageId: string): Promise<void> {
  const result = await tools.remove(USAGE_COLLECTION, usageId)
  if (!result.success) console.error(`[usage] release failed for ${usageId}: ${result.error}`)
}
