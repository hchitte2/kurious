/**
 * Per-stage retry for AI and integration calls inside the make-card job.
 *
 * Each attempt gets a fresh signal: the job's own signal (cancel) combined
 * with a STAGE_TIMEOUT_MS timeout (spike S4). 3 attempts with backoff; no
 * retry on a 4xx (bad request, forbidden, 402 out of credits), except 408/429
 * which are transient. A job cancel stops immediately.
 */

import { APICallError } from 'ai'
import { STAGE_TIMEOUT_MS } from '../config'

/** An integration (or upload) failure that carries the upstream HTTP status. */
export class StageError extends Error {
  readonly status: number | undefined
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'StageError'
    this.status = status
  }
}

function statusOf(err: unknown): number | undefined {
  if (APICallError.isInstance(err)) return err.statusCode
  if (err instanceof StageError) return err.status
  return undefined
}

export function isRetryable(err: unknown): boolean {
  const status = statusOf(err)
  if (status === undefined) return true
  if (status === 408 || status === 429) return true
  return status < 400 || status >= 500
}

export interface RetryOptions {
  /** The job's signal: once aborted, nothing more is attempted. */
  jobSignal: AbortSignal
  /** For logs. */
  label: string
  attempts?: number
  /** Runs before every attempt (the job uses it as a heartbeat). */
  onAttempt?: (attempt: number) => Promise<void>
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const attempts = options.attempts ?? 3
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (options.jobSignal.aborted) throw new Error(`${options.label}: job canceled`)
    await options.onAttempt?.(attempt)
    const signal = AbortSignal.any([options.jobSignal, AbortSignal.timeout(STAGE_TIMEOUT_MS)])
    try {
      return await fn(signal)
    } catch (err) {
      lastError = err
      const more = attempt < attempts && !options.jobSignal.aborted && isRetryable(err)
      console.warn(
        `[make-card] ${options.label} attempt ${attempt}/${attempts} failed${more ? ', retrying' : ''}: ${shortMessage(err)}`,
      )
      if (!more) break
      await sleep(Math.min(8_000, 1_500 * 3 ** (attempt - 1)) * (0.75 + Math.random() * 0.5))
    }
  }
  throw lastError
}

/** A short, log- and record-safe description of an error (no tokens). */
export function shortMessage(err: unknown, max = 180): string {
  const raw = err instanceof Error ? `${err.name === 'Error' ? '' : `${err.name}: `}${err.message}` : String(err)
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+/g, '[jwt]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}
