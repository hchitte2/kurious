/**
 * useAsk(): POST ASK_ROUTE as the signed-in grown-up (Bearer JWT, see api.ts)
 * and map every AskError code to kid-friendly copy. The worker's own message
 * is for grown-ups and logs; kids only ever see `copy` below.
 */

import { useCallback, useState } from 'react'
import { fixtureViews } from '../fixtures/cards'
import {
  ASK_ERROR_CODES,
  ASK_ROUTE,
  type AskErrorCode,
  type AskRequest,
  normalizeQuestion,
} from '../shared/card'
import { isRecord, postJson } from './api'
import { fixtureDelay, isFixtureMode } from './fixtureMode'

export type AskFailureCode = AskErrorCode | 'network'

export interface AskFailure {
  code: AskFailureCode
  /** What Kuri says. Never mentions models or errors. */
  copy: string
  /** Worth offering "Try again" for. */
  canRetry: boolean
}

export type AskResult = { ok: true; cardId: string; reused: boolean } | ({ ok: false } & AskFailure)

export const ASK_COPY: Record<AskFailureCode, { copy: string; canRetry: boolean }> = {
  unauthenticated: { copy: 'Grown-ups: sign in so Kuri can answer.', canRetry: false },
  daily_cap_reached: {
    copy: "Kuri has answered lots of questions today and needs an owl nap. Come back tomorrow for more wonders!",
    canRetry: false,
  },
  invalid_question: {
    copy: 'Hmm, Kuri didn’t quite catch that. Try asking with “Why”, “How” or “What”.',
    canRetry: false,
  },
  parent_not_found: {
    copy: 'Kuri lost track of that trail. Try asking it as a new question!',
    canRetry: false,
  },
  not_found: { copy: 'Hmm, Kuri can’t find that card.', canRetry: false },
  not_retryable: { copy: 'This one is already on its way!', canRetry: false },
  server_error: { copy: 'Oops, my paintbrush slipped. Try again?', canRetry: true },
  network: { copy: 'Kuri can’t reach the nest right now. Check the internet and try again?', canRetry: true },
}

function failure(code: AskFailureCode): { ok: false } & AskFailure {
  return { ok: false, code, ...ASK_COPY[code] }
}

function isAskErrorCode(value: unknown): value is AskErrorCode {
  return typeof value === 'string' && (ASK_ERROR_CODES as readonly string[]).includes(value)
}

/** Fixture mode: jump to the fixture with the same question, else a queued card. */
async function fixtureAsk(req: AskRequest): Promise<AskResult> {
  await fixtureDelay(500)
  const key = normalizeQuestion(req.question)
  const match = fixtureViews.find((card) => normalizeQuestion(card.question) === key)
  if (match) return { ok: true, cardId: match.id, reused: true }
  return { ok: true, cardId: req.parentCardId ? 'fx-sun-night' : 'fx-queued', reused: false }
}

export function useAsk() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AskFailure | null>(null)

  const ask = useCallback(async (req: AskRequest): Promise<AskResult> => {
    setPending(true)
    setError(null)
    let result: AskResult
    try {
      if (isFixtureMode()) {
        result = await fixtureAsk(req)
      } else {
        const res = await postJson(ASK_ROUTE, req)
        const body = res.body
        if (isRecord(body) && body.ok === true && typeof body.cardId === 'string') {
          result = { ok: true, cardId: body.cardId, reused: body.reused === true }
        } else if (isRecord(body) && isAskErrorCode(body.error)) {
          result = failure(body.error)
        } else if (res.status === 401) {
          result = failure('unauthenticated')
        } else if (res.status === 429) {
          result = failure('daily_cap_reached')
        } else {
          result = failure('server_error')
        }
      }
    } catch {
      result = failure('network')
    }
    setPending(false)
    if (!result.ok) setError({ code: result.code, copy: result.copy, canRetry: result.canRetry })
    return result
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { ask, pending, error, clearError }
}
