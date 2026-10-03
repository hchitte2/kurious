/**
 * The Wonder Wall: public, ready cards, newest first, from WALL_ROUTE (no
 * sign-in needed). The SDK's paged hook counts pages from 1; the worker pages
 * by cursor, so we remember each page's cursor as the previous page lands.
 */

import { useCallback, useRef } from 'react'
import { type PagedResourceFetchArgs, type PagedResourcePage, useAsyncResource, usePagedResource } from 'deepspace'
import { fixtureWall } from '../fixtures/cards'
import { type CardView, WALL_ROUTE, type WallPage } from '../shared/card'
import { getJson, isRecord } from './api'
import { fixtureDelay, useFixtureMode } from './fixtureMode'
import { normalizeView } from './normalize'

async function fetchWallPage(limit: number, cursor: string | undefined, signal: AbortSignal): Promise<WallPage> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  const res = await getJson(`${WALL_ROUTE}?${params}`, signal)
  const body = res.body
  if (res.status >= 400 || !isRecord(body) || !Array.isArray(body.items)) {
    throw new Error(`Wall request failed (${res.status})`)
  }
  return {
    items: (body.items as CardView[]).map(normalizeView),
    nextCursor: typeof body.nextCursor === 'string' ? body.nextCursor : null,
  }
}

export function useWall(pageSize = 12) {
  const fixtures = useFixtureMode()
  const cursors = useRef(new Map<number, string>())

  const fetchPage = useCallback(
    async ({ page, pageSize: limit, signal }: PagedResourceFetchArgs): Promise<PagedResourcePage<CardView>> => {
      if (fixtures) {
        await fixtureDelay(250, signal)
        return { items: page === 1 ? fixtureWall.items : [], hasMore: false }
      }
      if (page === 1) cursors.current.clear()
      const cursor = page === 1 ? undefined : cursors.current.get(page)
      if (page > 1 && !cursor) return { items: [], hasMore: false }
      const result = await fetchWallPage(limit, cursor, signal)
      if (result.nextCursor) cursors.current.set(page + 1, result.nextCursor)
      return { items: result.items, hasMore: result.nextCursor !== null }
    },
    [fixtures],
  )

  return usePagedResource<CardView>(fetchPage, [fixtures], { pageSize })
}

/** A handful of the newest Wall cards, for the strip on the Ask screen. */
export function useWallPreview(count = 6) {
  const fixtures = useFixtureMode()
  return useAsyncResource<CardView[]>(
    async (signal) => {
      if (fixtures) {
        await fixtureDelay(200, signal)
        return fixtureWall.items.slice(0, count)
      }
      const page = await fetchWallPage(count, undefined, signal)
      return page.items.slice(0, count)
    },
    [fixtures, count],
    { retry: 1 },
  )
}
