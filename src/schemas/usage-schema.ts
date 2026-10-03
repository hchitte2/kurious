/**
 * Usage: an append-only log, one row per paid card (a new ask or a retry).
 * The daily caps count rows per (userId, day) and per day (global).
 *
 * A log rather than a counter row: two concurrent asks can never lose an
 * increment, and the ask route inserts first then counts, so a race can only
 * refuse an ask, never let one past the cap (src/worker/usage.ts).
 *
 * Server-only: no client role can read or write it.
 */

import type { CollectionSchema } from 'deepspace/schema'

export const USAGE_COLLECTION = 'usage'

export const usageSchema: CollectionSchema = {
  name: USAGE_COLLECTION,
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain' },
    /** UTC day, YYYY-MM-DD. */
    { name: 'day', storage: 'text', interpretation: 'plain' },
    { name: 'cardId', storage: 'text', interpretation: 'plain' },
    { name: 'kind', storage: 'text', interpretation: { kind: 'select', options: ['ask', 'retry'] } },
  ],
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: false, create: false, update: false, delete: false },
    admin: { read: false, create: false, update: false, delete: false },
  },
}
