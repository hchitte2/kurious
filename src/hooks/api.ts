/**
 * Calls to Kurious' own worker routes (src/shared/card.ts API section).
 *
 * Auth: the SDK's `getAuthToken()` returns a short-lived JWT for the signed-in
 * user (fetched from same-origin /api/auth/token with the session cookie and
 * cached); we send it as `Authorization: Bearer <jwt>`, the same pattern the
 * reference apps use for their own routes. Signed out, no header is sent and
 * the worker answers `unauthenticated`.
 */

import { getAuthToken } from 'deepspace'

async function authHeaders(): Promise<Record<string, string>> {
  let token: string | null = null
  try {
    token = await getAuthToken()
  } catch {
    token = null
  }
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface ApiResult {
  status: number
  /** Parsed JSON body, or null when the body wasn't JSON. */
  body: unknown
}

export async function postJson(path: string, payload: unknown, signal?: AbortSignal): Promise<ApiResult> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(payload),
    signal,
  })
  return { status: res.status, body: await readJson(res) }
}

export async function getJson(path: string, signal?: AbortSignal): Promise<ApiResult> {
  const res = await fetch(path, { headers: await authHeaders(), signal })
  return { status: res.status, body: await readJson(res) }
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
