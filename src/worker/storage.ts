/**
 * Save a base64 data URI to APP-scope file storage under a fixed key, and
 * return the public, same-origin URL to store on the card (spike S5):
 * `/api/files/<returned key>?scope=app`. Anyone can GET that one file (Range
 * and If-None-Match work, so iOS audio plays); nothing expires.
 *
 * Fixed keys (`cards/<id>/image.png`) mean a retry overwrites the same file.
 * The upload acts as the app owner; our /api/files proxy refuses client
 * writes, so only the worker can put files here.
 */

import { platformWorkerFetch } from 'deepspace/worker'
import type { Env } from '../../worker.js'
import { StageError } from './retry.js'

interface UploadResponse {
  success?: boolean
  key?: string
  error?: string
}

const DATA_URI = /^data:([^;,]*)((?:;[^;,]*)*),/

export async function uploadAppFile(
  env: Env,
  key: string,
  dataUriOrBase64: string,
  fallbackMimeType: string,
  signal?: AbortSignal,
): Promise<string> {
  const match = DATA_URI.exec(dataUriOrBase64)
  const declared = match?.[1]?.toLowerCase() ?? ''
  // Trust the data URI's own type when it is the same kind of media
  // (Gemini may hand back JPEG); otherwise use the configured type.
  const kind = fallbackMimeType.split('/')[0]
  const mimeType = declared.startsWith(`${kind}/`) ? declared : fallbackMimeType
  const base64 = match ? dataUriOrBase64.slice(match[0].length) : dataUriOrBase64
  if (!base64) throw new StageError(`upload ${key}: empty file`)

  const body = new TextEncoder().encode(
    JSON.stringify({ data: base64, name: key.slice(key.lastIndexOf('/') + 1), mimeType }),
  )
  const headers = new Headers({
    'Content-Type': 'application/json',
    // The platform refuses uploads without a declared length.
    'Content-Length': String(body.byteLength),
    'x-user-id': env.OWNER_USER_ID,
  })
  if (env.APP_IDENTITY_TOKEN) {
    headers.set('x-app-identity-token', env.APP_IDENTITY_TOKEN)
    headers.set('x-app-id', env.DEEPSPACE_APP_ID)
  }

  const query = new URLSearchParams({ scope: 'app', key })
  const res = await platformWorkerFetch(
    env,
    new Request(`https://internal/internal/files/upload?${query.toString()}`, {
      method: 'POST',
      headers,
      body,
      signal,
    }),
  )
  const text = await res.text()
  let parsed: UploadResponse = {}
  try {
    parsed = text ? (JSON.parse(text) as UploadResponse) : {}
  } catch {
    parsed = { error: text.slice(0, 120) }
  }
  if (!res.ok || !parsed.success || !parsed.key) {
    throw new StageError(`upload ${key}: HTTP ${res.status} ${parsed.error ?? ''}`.trim(), res.status)
  }
  // Always the RETURNED key (hand-built keys 403), each segment encoded.
  const path = parsed.key.split('/').map(encodeURIComponent).join('/')
  return `/api/files/${path}?scope=app`
}
