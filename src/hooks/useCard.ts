/**
 * useCard(id): one card as a CardView, whoever is looking.
 *
 * 1. Signed in: the live owner record via `useQuery('cards', { where: { ownerId } })`
 *    (records stream in as the job fills them in: progressive reveal for free).
 *    `where` filters data columns only, so we filter by ownerId and pick the
 *    record by id (the reference apps do the same).
 * 2. Not the owner's card, or signed out: GET publicCardRoute(id), which the
 *    worker answers only for public cards.
 * 3. Fixture mode: findFixture(id).
 */

import { useEffect, useMemo, useState } from 'react'
import { useAsyncResource, useAuthStatus, useQuery } from 'deepspace'
import { findFixture } from '../fixtures/cards'
import {
  CARDS_COLLECTION,
  type CardData,
  type CardView,
  type PublicCardResponse,
  publicCardRoute,
} from '../shared/card'
import { getJson, isRecord } from './api'
import { useFixtureMode } from './fixtureMode'
import { normalizeView, recordToView } from './normalize'

export type CardSource = 'owner' | 'public' | 'fixture'

export type CardState =
  | { status: 'loading' }
  | { status: 'ready'; card: CardView; source: CardSource }
  | { status: 'not_found' }
  | { status: 'error'; retry: () => void }

/** How long a settled owner query may lack the card before we call it someone else's. */
const OWNER_GRACE_MS = 1500

const NO_OWNER = '__signed_out__'

export function useCard(id: string): CardState {
  const fixtures = useFixtureMode()
  const { isSignedIn, userId } = useAuthStatus()

  const owner = useQuery<CardData>(CARDS_COLLECTION, {
    where: { ownerId: isSignedIn && userId && !fixtures ? userId : NO_OWNER },
  })
  const ownerRecord = useMemo(() => owner.records.find((r) => r.recordId === id), [owner.records, id])
  const ownerSettled = fixtures || !isSignedIn || owner.status !== 'loading'

  // A settled query can briefly miss a record that's about to arrive (e.g.
  // right after /api/ask returns). Give it a moment before deciding.
  const [graceOver, setGraceOver] = useState(false)
  useEffect(() => {
    setGraceOver(false)
    if (!ownerSettled || ownerRecord) return
    const timer = setTimeout(() => setGraceOver(true), isSignedIn ? OWNER_GRACE_MS : 0)
    return () => clearTimeout(timer)
  }, [ownerSettled, ownerRecord, isSignedIn, id])

  const needPublic = !fixtures && !ownerRecord && ownerSettled
  const pub = useAsyncResource<PublicCardResponse>(
    async (signal) => {
      const res = await getJson(publicCardRoute(id), signal)
      if (res.status === 404) return { ok: false, error: 'not_found' }
      if (res.status >= 400 || !isRecord(res.body)) throw new Error(`Card request failed (${res.status})`)
      return res.body as PublicCardResponse
    },
    [id],
    { enabled: needPublic, keepPreviousData: false, retry: 1 },
  )

  if (fixtures) {
    const card = findFixture(id)
    return card ? { status: 'ready', card, source: 'fixture' } : { status: 'not_found' }
  }
  if (ownerRecord) {
    return { status: 'ready', card: recordToView(ownerRecord), source: 'owner' }
  }
  if (!ownerSettled) return { status: 'loading' }

  if (pub.status === 'ready' && pub.data) {
    if (pub.data.ok && pub.data.card.id === id) return { status: 'ready', card: normalizeView(pub.data.card), source: 'public' }
    if (!pub.data.ok) return graceOver ? { status: 'not_found' } : { status: 'loading' }
  }
  if (pub.status === 'error') return { status: 'error', retry: pub.reload }
  return { status: 'loading' }
}
