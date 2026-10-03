/**
 * The card's picture and narration (spike S1 + config.ts IMAGE / NARRATION).
 * Both integrations return base64 data URIs, never hosted URLs, so each one
 * is uploaded to app storage right away; a data URI never lands on the card.
 * Owner-billed: only reachable from the make-card job, behind the caps.
 */

import { IMAGE, IMAGE_STYLE_SUFFIX, NARRATION } from '../config'
import { callIntegration } from '../server/action-routes.js'
import type { Env } from '../../worker.js'
import { StageError } from './retry.js'
import { uploadAppFile } from './storage.js'

async function integration<T>(env: Env, endpoint: string, body: unknown, signal: AbortSignal): Promise<T> {
  const result = await callIntegration<T>(env, endpoint, body, { callerJwt: env.APP_OWNER_JWT, signal })
  if (!result.success) {
    throw new StageError(`${endpoint}: ${result.code ?? 'failed'} ${result.error}`.trim(), result.status)
  }
  return result.data
}

export const imageKey = (cardId: string) => `cards/${cardId}/image.png`
export const narrationKey = (cardId: string) => `cards/${cardId}/narration.mp3`

/** Paint the picture and store it. Returns the card's `imageUrl`. */
export async function paintPicture(
  env: Env,
  cardId: string,
  imagePrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const data = await integration<{ base64Images?: string[] }>(
    env,
    IMAGE.endpoint,
    { prompt: `${imagePrompt.trim().replace(/[.\s]+$/, '')}. ${IMAGE_STYLE_SUFFIX}`, model: IMAGE.model, aspectRatio: IMAGE.aspectRatio },
    signal,
  )
  const image = data.base64Images?.find((item) => typeof item === 'string' && item.length > 0)
  // An empty array means the content filter blocked it (spike S1).
  if (!image) throw new StageError(`${IMAGE.endpoint}: no image came back (content filter?)`)
  return uploadAppFile(env, imageKey(cardId), image, IMAGE.mimeType, signal)
}

/** Record the narration and store it. Returns the card's `audioUrl`. */
export async function recordNarration(
  env: Env,
  cardId: string,
  paragraph: string,
  signal: AbortSignal,
): Promise<string> {
  const data = await integration<{ audioUrl?: string }>(
    env,
    NARRATION.endpoint,
    {
      input: paragraph,
      model: NARRATION.model,
      voice: NARRATION.voice,
      response_format: NARRATION.responseFormat,
      speed: NARRATION.speed,
    },
    signal,
  )
  if (!data.audioUrl) throw new StageError(`${NARRATION.endpoint}: no audio came back`)
  return uploadAppFile(env, narrationKey(cardId), data.audioUrl, NARRATION.mimeType, signal)
}
