/**
 * The `make-card` background job: one card, one job room (`card:<id>`).
 *
 *   queued -> safety -> (declined | writing) -> checking -> illustrating -> ready
 *   any thrown error -> error (errorMessage = "<stage>: <reason>")
 *
 * Every change is written to the card record as it happens, so the owner's
 * live `useQuery` sees the paragraph, then the picture, then the audio.
 * A stage whose output is already saved is skipped (a Retry keeps content).
 * Every AI / integration attempt "touches" the card first, so a healthy job
 * never looks stale (STALE_AFTER_MS) while a slow call is in flight.
 */

import { deepSpaceAgentErrorSummary } from 'deepspace/worker'
import type { JobContext } from 'deepspace/worker'
import { MODELS, type ModelRole } from '../config'
import type { CardCheck, CardData, CardStatus } from '../shared/card'
import { checkCard, classifySafety, rewriteCard, writeCard, type CardDraft, type WriteInput } from '../ai/card-ai.js'
import { lengthIssues } from '../ai/prompts.js'
import type { Env } from '../../worker.js'
import { paintPicture, recordNarration } from './media.js'
import { appTools, getCard, updateCard } from './records.js'
import { shortMessage, withRetry } from './retry.js'

export const MAKE_CARD_JOB = 'make-card'

export interface MakeCardPayload {
  cardId: string
}

export function readMakeCardPayload(payload: unknown): MakeCardPayload | null {
  if (typeof payload !== 'object' || payload === null) return null
  const cardId = (payload as { cardId?: unknown }).cardId
  return typeof cardId === 'string' && cardId ? { cardId } : null
}

type Stage = 'safety' | 'writing' | 'checking' | 'illustrating' | 'ready'

export type MakeCardOutcome = CardStatus | 'skipped'

/** The Wall's rule, applied once at `ready`. */
export function wallFor(data: CardData): CardData['wall'] {
  const ok =
    data.safety?.label === 'ok' &&
    !data.safety.personal &&
    data.check?.verdict === 'pass' &&
    Boolean(data.imageUrl) &&
    Boolean(data.paragraph)
  return ok ? 'public' : 'private'
}

function logAiError(role: ModelRole, err: unknown): void {
  const { provider, modelId } = MODELS[role]
  console.error(`[make-card] ${role}: ${deepSpaceAgentErrorSummary(err, { provider, modelId })}`)
}

export async function makeCard(env: Env, ctx: JobContext, cardId: string): Promise<MakeCardOutcome> {
  const tools = appTools(env)
  // One retry on a transient read failure, so a blip doesn't leave the card queued until stale.
  const card = await getCard(tools, cardId).catch(() => getCard(tools, cardId))
  if (!card) {
    console.warn(`[make-card] ${cardId}: no such card`)
    return 'skipped'
  }
  // Guard: only a queued card runs (a duplicate or late job is a no-op).
  if (card.data.status !== 'queued') return 'skipped'

  let data: CardData = card.data
  const save = async (patch: Partial<CardData>) => {
    await updateCard(tools, cardId, patch)
    data = { ...data, ...patch }
  }
  // Heartbeat: an update bumps updatedAt, which is what isStale() reads.
  const touch = async () => {
    await updateCard(tools, cardId, {}).catch(() => undefined)
  }
  const attempt = <T>(label: string, fn: (signal: AbortSignal) => Promise<T>) =>
    withRetry(fn, { jobSignal: ctx.signal, label: `${cardId} ${label}`, onAttempt: touch })

  let stage: Stage = 'safety'
  try {
    // 1. Safety gate.
    let safety = data.safety
    if (!safety) {
      try {
        safety = await attempt('safety', (signal) => classifySafety(env, data.question, signal))
      } catch (err) {
        logAiError('safety', err)
        throw err
      }
      await save({ safety })
    }
    if (safety.label === 'decline') {
      await save({ status: 'declined', wall: 'private' })
      return 'declined'
    }

    const input: WriteInput = { question: data.question, ageBand: data.ageBand, gentle: safety.label === 'gentle' }

    // 2. Write. The paragraph + follow-ups land together (progressive reveal).
    stage = 'writing'
    if (!data.paragraph) {
      await save({ status: 'writing' })
      let draft: CardDraft
      try {
        draft = await attempt('writer', (signal) => writeCard(env, input, signal))
      } catch (err) {
        logAiError('writer', err)
        throw err
      }
      await save({ ...draft, writerModel: MODELS.writer.modelId, status: 'checking' })
    }

    // 3. Check (P1): a different provider; one rewrite on failure.
    stage = 'checking'
    if (!data.check) {
      if (data.status !== 'checking') await save({ status: 'checking' })
      const check = await runCheck(env, input, () => data, save, attempt)
      if (check) await save({ check })
    }

    // 4. Picture + narration in parallel; each URL is saved as it lands. A
    //    media failure leaves that URL null and never fails the card.
    stage = 'illustrating'
    await save({ status: 'illustrating' })
    const paragraph = data.paragraph ?? ''
    const imagePrompt = data.imagePrompt ?? data.question
    const results = await Promise.allSettled([
      data.imageUrl
        ? Promise.resolve()
        : attempt('picture', (signal) => paintPicture(env, cardId, imagePrompt, signal)).then((imageUrl) =>
            save({ imageUrl }),
          ),
      data.audioUrl
        ? Promise.resolve()
        : attempt('narration', (signal) => recordNarration(env, cardId, paragraph, signal)).then((audioUrl) =>
            save({ audioUrl }),
          ),
    ])
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[make-card] ${cardId} ${index === 0 ? 'picture' : 'narration'} gave up: ${shortMessage(result.reason)}`)
      }
    })
    if (ctx.signal.aborted) throw new Error('job canceled')

    // 5. Ready. `wall` is decided once, here.
    stage = 'ready'
    await save({ status: 'ready', wall: wallFor(data), errorMessage: null })
    return 'ready'
  } catch (err) {
    const reason = `${stage}: ${shortMessage(err, 160)}`
    console.error(`[make-card] ${cardId} failed at ${reason}`)
    await updateCard(tools, cardId, { status: 'error', errorMessage: reason }).catch((writeErr: unknown) =>
      console.error(`[make-card] ${cardId} could not record the error: ${shortMessage(writeErr)}`),
    )
    return 'error'
  }
}

/**
 * Check -> (fail) one rewrite with the issues verbatim -> re-check.
 * Returns null (no badge, never public) when the checker itself can't answer;
 * the kid still gets the card.
 */
async function runCheck(
  env: Env,
  input: WriteInput,
  current: () => CardData,
  save: (patch: Partial<CardData>) => Promise<void>,
  attempt: <T>(label: string, fn: (signal: AbortSignal) => Promise<T>) => Promise<T>,
): Promise<CardCheck | null> {
  const checkerModel = MODELS.checker.modelId
  const check = (data: CardData) =>
    attempt('checker', (signal) =>
      checkCard(
        env,
        { question: input.question, ageBand: input.ageBand, paragraph: data.paragraph ?? '', keyIdea: data.keyIdea ?? '' },
        signal,
      ),
    )

  // The checker judges truth and age fit; code judges length (lengthIssues).
  const verdictFor = async (data: CardData) => {
    const result = await check(data)
    const issues = [
      ...(result.verdict === 'fail' ? result.issues : []),
      ...lengthIssues(data.paragraph ?? '', input.ageBand),
    ]
    return { verdict: issues.length === 0 ? ('pass' as const) : ('fail' as const), issues }
  }

  let first
  try {
    first = await verdictFor(current())
  } catch (err) {
    logAiError('checker', err)
    return null
  }
  if (first.verdict === 'pass') return { verdict: 'pass', issues: [], checkerModel, rewrites: 0 }

  const before = current()
  let rewritten: CardDraft
  try {
    rewritten = await attempt('rewrite', (signal) =>
      rewriteCard(
        env,
        input,
        {
          paragraph: before.paragraph ?? '',
          keyIdea: before.keyIdea ?? '',
          followUps: before.followUps,
          imagePrompt: before.imagePrompt ?? '',
        },
        first.issues,
        signal,
      ),
    )
  } catch (err) {
    logAiError('writer', err)
    return { verdict: 'fail', issues: first.issues, checkerModel, rewrites: 0 }
  }
  await save({ ...rewritten })

  try {
    const second = await verdictFor(current())
    return { verdict: second.verdict, issues: second.issues, checkerModel, rewrites: 1 }
  } catch (err) {
    logAiError('checker', err)
    return null
  }
}
