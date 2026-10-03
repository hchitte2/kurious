/**
 * Background-job handler — invoked by AppJobRoom (worker.ts) for every job
 * picked up from the queue. Dispatch on `job.type`; return a result
 * (captured as `job.result`) or throw to fail.
 *
 * Kurious has one job: `make-card` (src/worker/make-card.ts), enqueued only
 * by worker routes (src/server/card-routes.ts) after sign-in and the daily
 * caps, one room per card. It never throws for a card failure: it writes
 * `status: 'error'` onto the card itself, since a thrown job leaves the card
 * untouched (spike S4).
 */

import type { Job, JobContext } from 'deepspace/worker'
import type { Env } from '../worker.js'
import { MAKE_CARD_JOB, makeCard, readMakeCardPayload } from './worker/make-card.js'

export async function runJob(job: Job, ctx: JobContext, env: Env): Promise<unknown> {
  switch (job.type) {
    case MAKE_CARD_JOB: {
      const payload = readMakeCardPayload(job.payload)
      if (!payload) throw new Error(`${MAKE_CARD_JOB}: payload must be { cardId }`)
      return { cardId: payload.cardId, outcome: await makeCard(env, ctx, payload.cardId) }
    }
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}
