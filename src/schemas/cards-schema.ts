/**
 * Cards: one picture + one paragraph + 2-3 "But why?" follow-ups.
 *
 * Written ONLY by the worker (the ask route and the make-card job, both as the
 * app via X-App-Action). Clients only read their own rows (`ownerId`). The
 * Wall and share links never read this collection from the client: they go
 * through worker routes that return CardView (src/server/card-routes.ts).
 *
 * `ownerId` is NOT userBound: userBound would stamp the writer (the app owner)
 * over the asker's id (spike S4).
 *
 * Note: the record room drops NULL columns when it reads a row, so a field
 * written as null comes back absent from `record.data`.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { AGE_BANDS, CARDS_COLLECTION, CARD_STATUSES } from '../shared/card'

const text = (name: string) => ({ name, storage: 'text' as const, interpretation: 'plain' })
const json = (name: string, fallback?: unknown) => ({
  name,
  storage: 'text' as const,
  interpretation: { kind: 'json' as const },
  ...(fallback === undefined ? {} : { default: fallback }),
})

export const cardsSchema: CollectionSchema = {
  name: CARDS_COLLECTION,
  ownerField: 'ownerId',
  columns: [
    text('ownerId'),
    text('question'),
    text('normalizedQuestion'),
    { name: 'ageBand', storage: 'text', interpretation: { kind: 'select', options: [...AGE_BANDS] } },
    {
      name: 'status',
      storage: 'text',
      interpretation: { kind: 'select', options: [...CARD_STATUSES] },
      default: 'queued',
    },
    text('paragraph'),
    text('keyIdea'),
    json('followUps', []),
    text('imagePrompt'),
    text('imageUrl'),
    text('audioUrl'),
    text('parentCardId'),
    text('rootCardId'),
    json('trail', []),
    json('safety'),
    json('check'),
    text('writerModel'),
    text('reusedFromCardId'),
    {
      name: 'wall',
      storage: 'text',
      interpretation: { kind: 'select', options: ['private', 'public'] },
      default: 'private',
    },
    text('errorMessage'),
  ],
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: false, delete: false },
    // Even the owner's client only reads its own cards (so /me stays "mine").
    // Moderation, if needed, belongs in a worker route.
    admin: { read: 'own', create: false, update: false, delete: false },
  },
}
