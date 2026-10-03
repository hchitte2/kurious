/**
 * The signed-in grown-up's own cards, live (`useQuery` on `cards`, filtered
 * by ownerId), grouped into trails by `rootCardId ?? recordId`.
 */

import { useMemo } from 'react'
import { type RecordData, useAuthStatus, useQuery } from 'deepspace'
import { fixtureCards } from '../fixtures/cards'
import { CARDS_COLLECTION, type CardData, type CardView, toCardData } from '../shared/card'
import { useFixtureMode } from './fixtureMode'
import { recordToView } from './normalize'

export interface Trail {
  rootId: string
  /** Stops in the order they were asked (root first). */
  stops: CardView[]
  /** Latest activity on the trail, for sorting. */
  lastAt: string
}

export function groupTrails(records: RecordData<CardData>[]): Trail[] {
  const byRoot = new Map<string, RecordData<CardData>[]>()
  for (const record of records) {
    const rootId = toCardData(record.data).rootCardId ?? record.recordId
    const list = byRoot.get(rootId) ?? []
    list.push(record)
    byRoot.set(rootId, list)
  }
  const trails: Trail[] = []
  for (const [rootId, list] of byRoot) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const lastAt = list.reduce((latest, r) => (r.updatedAt > latest ? r.updatedAt : latest), list[0].updatedAt)
    trails.push({ rootId, stops: list.map(recordToView), lastAt })
  }
  return trails.sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

const NO_OWNER = '__signed_out__'

export function useMyCards() {
  const fixtures = useFixtureMode()
  const { isSignedIn, userId } = useAuthStatus()
  const query = useQuery<CardData>(CARDS_COLLECTION, {
    where: { ownerId: isSignedIn && userId && !fixtures ? userId : NO_OWNER },
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const records = fixtures ? fixtureCards : query.records
  const trails = useMemo(() => groupTrails(records), [records])
  const status: 'loading' | 'ready' | 'error' = fixtures ? 'ready' : query.status
  return { status, trails, count: records.length }
}
