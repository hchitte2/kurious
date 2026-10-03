/**
 * useRetry(cardId): POST retryRoute(cardId) as the signed-in owner (Bearer JWT,
 * see api.ts). Works for cards in `error` and for stale generating cards. On
 * success the live owner record flips back to `queued`, so the card page needs
 * nothing else.
 */

import { useCallback, useState } from 'react'
import { retryRoute } from '../shared/card'
import { isRecord, postJson } from './api'
import { fixtureDelay, isFixtureMode } from './fixtureMode'

/**
 * ok: the job restarted. busy: it's already running (409 not_retryable).
 * capped: today's limit is used up. failed: anything else.
 */
export type RetryOutcome = 'ok' | 'unauthenticated' | 'busy' | 'capped' | 'failed'

export function useRetry(cardId: string) {
  const [pending, setPending] = useState(false)
  const [outcome, setOutcome] = useState<RetryOutcome | null>(null)

  const retry = useCallback(async (): Promise<RetryOutcome> => {
    setPending(true)
    setOutcome(null)
    let result: RetryOutcome
    try {
      if (isFixtureMode()) {
        await fixtureDelay(600)
        result = 'ok'
      } else {
        const res = await postJson(retryRoute(cardId), {})
        const code = isRecord(res.body) && typeof res.body.error === 'string' ? res.body.error : null
        if (res.status < 400 && isRecord(res.body) && res.body.ok === true) result = 'ok'
        else if (res.status === 401 || code === 'unauthenticated') result = 'unauthenticated'
        else if (res.status === 409 || code === 'not_retryable') result = 'busy'
        else if (res.status === 429 || code === 'daily_cap_reached') result = 'capped'
        else result = 'failed'
      }
    } catch {
      result = 'failed'
    }
    setPending(false)
    setOutcome(result)
    return result
  }, [cardId])

  return { retry, pending, outcome }
}
