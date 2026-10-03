/**
 * Kurious config: the ONE place model ids live (role -> provider + modelId),
 * plus the knobs the card pipeline reads. Worker-side; the UI imports from
 * src/shared instead.
 *
 * Swapping a role to another provider is a one-line change here: that is the
 * provider-portability story.
 */

import type { DEEPSPACE_AI_MODELS, DeepSpaceAIProvider } from 'deepspace/worker'
import type { AgeBand } from './shared/card'

// ── Model roles ─────────────────────────────────────────────────────────────

export type ModelRole = 'writer' | 'checker' | 'safety'

type CatalogModel = (typeof DEEPSPACE_AI_MODELS)[number]

/**
 * A provider plus a model id that provider actually serves (checked at
 * compile time against the SDK catalog, so there is no copied list here).
 * Always set maxOutputTokens: Anthropic reserves credits against it (default
 * 64k), and on OpenAI it includes reasoning tokens, so too low = empty output.
 */
export type ModelChoice = {
  [P in DeepSpaceAIProvider]: {
    provider: P
    modelId: Extract<CatalogModel, { provider: P }>['id']
    maxOutputTokens: number
  }
}[DeepSpaceAIProvider]

export const MODELS = {
  /** Writes the paragraph, key idea, follow-ups and image prompt. */
  writer: { provider: 'anthropic', modelId: 'claude-sonnet-5', maxOutputTokens: 1200 },
  /** Checks truth and age fit. Deliberately a different provider from the writer. Use reasoningEffort 'low'. */
  checker: { provider: 'openai', modelId: 'gpt-6-sol', maxOutputTokens: 4000 },
  /** One cheap classification: ok | gentle | decline, plus `personal`. */
  safety: { provider: 'anthropic', modelId: 'claude-haiku-4-5', maxOutputTokens: 200 },
} as const satisfies Record<ModelRole, ModelChoice>

// ── Usage limits ────────────────────────────────────────────────────────────

/** New (paid) cards per signed-in user per UTC day. Reused cards are free. */
export const DAILY_CARD_CAP = 5

/**
 * Backstop across ALL users per UTC day, so a busy day can't drain the owner's
 * credits. Measured: about $0.20 per card on the free plan (all stages). Raise both
 * caps after topping up credits (`npx deepspace app usage`).
 */
export const GLOBAL_DAILY_CARD_CAP = 12

// ── Writing rules per age band ──────────────────────────────────────────────

export interface AgeBandWriting {
  /** Who the paragraph is for, in the writer's prompt. */
  reader: string
  minWords: number
  maxWords: number
  maxWordsPerSentence: number
}

export const AGE_BAND_WRITING: Record<AgeBand, AgeBandWriting> = {
  little: {
    reader: 'a 4-5 year old who is listening, not reading: everyday words, one idea, a friendly comparison to something they know',
    minWords: 35,
    maxWords: 55,
    maxWordsPerSentence: 12,
  },
  kid: {
    reader: 'a 6-8 year old early reader: simple words, one new word explained in place, a concrete example',
    minWords: 45,
    maxWords: 75,
    maxWordsPerSentence: 16,
  },
  big: {
    reader: 'a 9-11 year old: real terms named and explained, cause and effect, still one main idea',
    minWords: 60,
    maxWords: 95,
    maxWordsPerSentence: 22,
  },
}

export const FOLLOW_UPS = { min: 2, max: 3, maxChars: 48 } as const

// ── Picture ─────────────────────────────────────────────────────────────────

/** Appended to every image prompt so pictures match the UI palette (docs/DESIGN.md). */
export const IMAGE_STYLE_SUFFIX =
  "soft gouache children's picture-book illustration, warm cream paper texture, gentle rounded shapes, limited palette of warm orange, sky blue, leaf green and sunny yellow, friendly and calm, no text, no letters, no numbers"

export const IMAGE_ASPECT = '4:3'

/**
 * Integration endpoints (spike S1). Run `npx deepspace integrations info <endpoint>`
 * before changing one. Both return base64 data URIs, never hosted URLs: upload
 * them to app file storage, never store a data URI on the card.
 * Image fallback: 'openai/generate-image' (gpt-image-1-mini, 1536x1024, quality low).
 */
export const IMAGE = {
  endpoint: 'gemini/generate-image',
  model: 'gemini-2.5-flash-image',
  aspectRatio: IMAGE_ASPECT,
  mimeType: 'image/png',
} as const

/**
 * Cheapest narration (human call): OpenAI tts-1, about $0.008 per card.
 * Body: { input, model, voice, response_format, speed } -> { audioUrl: data URI }.
 */
export const NARRATION = {
  endpoint: 'speech/text-to-speech',
  model: 'tts-1',
  /** A warm storyteller voice. */
  voice: 'fable',
  responseFormat: 'mp3',
  /** A touch slower for young listeners. */
  speed: 0.92,
  mimeType: 'audio/mpeg',
} as const

// ── Managed knowledge: misconception cards (PLAN P2 #1) ─────────────────────

/**
 * Bump to re-seed every misconception card into a fresh folder (only needed
 * when Triggers change enough to matter for retrieval: the prompt text always
 * comes from src/knowledge/misconceptions.ts, never from the index).
 */
export const KNOWLEDGE_VERSION = 1

/**
 * Retrieval knobs (src/knowledge/lookup.ts). Billed per search query
 * ($0.825 / 1,000 semantic queries, about $0.0008 per card) plus one-time
 * ingestion of ~26 short cards (well under 1 cent). Listing is not billed.
 */
export const KNOWLEDGE = {
  folder: `misconceptions/v${KNOWLEDGE_VERSION}`,
  /** 'semantic' so the score and matchThreshold are both vector similarity (0-1). */
  mode: 'semantic',
  /** Cards handed to the writer and the checker. */
  topK: 3,
  /** Chunks fetched before de-duplicating by card id. */
  searchLimit: 8,
  /** Relevance cutoff (0-1). Tune from the scores in the `knowledge` log line. */
  minScore: 0.4,
  searchTimeoutMs: 4_000,
  /** Only the first card per isolate waits on this (one unbilled list call). */
  seedTimeoutMs: 15_000,
  /** After a failed seed, an isolate waits this long before trying again. */
  seedRetryAfterMs: 10 * 60_000,
} as const

// ── Pipeline timing ─────────────────────────────────────────────────────────

/** Per AI / integration call; combine with the job's ctx.signal (spike S4). */
export const STAGE_TIMEOUT_MS = 120_000
