/**
 * Fixture mode: every data hook returns src/fixtures/cards.ts data instead of
 * calling the worker, so every card state is browsable before (or without)
 * the backend.
 *
 * Turn it on with `?fixtures` on any URL (it sticks for the browser tab, so
 * in-app links keep working), or build with VITE_FIXTURES=1. `?fixtures=0`
 * turns it off again.
 */

import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'kurious:fixtures'

export function isFixtureMode(): boolean {
  const env: unknown = import.meta.env.VITE_FIXTURES
  if (env === '1' || env === 'true') return true
  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  if (params.has('fixtures')) {
    const off = params.get('fixtures') === '0'
    try {
      if (off) window.sessionStorage.removeItem(STORAGE_KEY)
      else window.sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Storage blocked (private mode): the URL flag still works for this page.
    }
    return !off
  }
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Re-checks on navigation so `?fixtures` / `?fixtures=0` take effect immediately. */
export function useFixtureMode(): boolean {
  const { search } = useLocation()
  // `search` is the dependency: isFixtureMode() reads it from window.location.
  return useMemo(() => isFixtureMode(), [search])
}

/** A small, cancellable pause so fixture "requests" feel like real ones. */
export function fixtureDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}
