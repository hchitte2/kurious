/**
 * Misconception cards in DeepSpace managed knowledge: automatic, idempotent
 * seeding plus fail-open retrieval for the make-card job (PLAN P2 #1).
 *
 * API (deepspace/worker, worker.d.ts:4080-4160; docs /bindings/knowledge):
 *   knowledge(env).add(file, { folder })      item key = `<folder>/<file.name>`
 *   knowledge(env).list({ folder, page, perPage <= 50 })   not billed
 *   knowledge(env).remove(itemId)
 *   knowledge(env).search(query, { folder, mode, limit, matchThreshold })
 *   failures throw KnowledgeError { status, code }
 * Upload completion only means "accepted": indexing is async (queued ->
 * running -> completed), so until it finishes a search just returns fewer hits.
 * Needs the `[[ai_search]]` binding in wrangler.toml (provisioned on deploy).
 *
 * Seeding: the folder is versioned (KNOWLEDGE.folder). The first lookup in an
 * isolate lists the folder once and adds every card whose `<id>.md` is
 * missing or errored; after a clean pass that isolate never lists again.
 * Concurrent seeds can double-upload a card: harmless, because retrieval
 * de-duplicates by card id and a later pass removes the extra copies (always
 * keeping the oldest, so two isolates never pick different survivors).
 *
 * Retrieval: one semantic search with a relevance cutoff, top KNOWLEDGE.topK
 * distinct cards. The prompt text comes from MISCONCEPTION_CARDS by id, never
 * from the index. Nothing here throws to the caller: any error or timeout
 * becomes zero hits plus a reason in the log summary.
 */

import { knowledge, KnowledgeError } from 'deepspace/worker'
import type { KnowledgeClient, KnowledgeEnv, KnowledgeItem, KnowledgeSearchChunk } from 'deepspace/worker'
import { KNOWLEDGE } from '../config'
import { shortMessage } from '../worker/retry.js'
import {
  cardFileName,
  MISCONCEPTION_CARDS,
  misconceptionById,
  renderCardMarkdown,
  type MisconceptionCard,
} from './misconceptions'

/** The client calls this module makes (tests pass a fake). */
export type KnowledgeApi = Pick<KnowledgeClient, 'add' | 'list' | 'remove' | 'search'>

export interface MisconceptionHit {
  card: MisconceptionCard
  score: number
}

export interface MisconceptionLookup {
  /** Best first, at most KNOWLEDGE.topK, each card once. */
  hits: MisconceptionHit[]
  /** One log-ready line: hit ids with scores, seed state, timing or the failure. */
  summary: string
}

// ── Seeding ─────────────────────────────────────────────────────────────────

export interface SeedReport {
  listed: number
  added: string[]
  failed: string[]
  removed: number
}

const PER_PAGE = 50
const MAX_LIST_PAGES = 4

/** `misconceptions/v1/seasons-distance.md` (or a bare filename) -> a known card id. */
export function cardIdOfKey(key: string | undefined): string | undefined {
  if (!key) return undefined
  const base = key.slice(key.lastIndexOf('/') + 1)
  if (!base.endsWith('.md')) return undefined
  const id = base.slice(0, -'.md'.length)
  return misconceptionById(id) ? id : undefined
}

async function listFolder(kb: KnowledgeApi, folder: string): Promise<KnowledgeItem[]> {
  const items: KnowledgeItem[] = []
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const result = await kb.list({ folder, page, perPage: PER_PAGE })
    items.push(...result.items)
    const lastPage = result.totalPages !== undefined ? page >= result.totalPages : result.items.length < PER_PAGE
    if (lastPage) break
  }
  return items
}

/** Oldest first, then by item id: every isolate keeps the same copy. */
function keepOrder(a: KnowledgeItem, b: KnowledgeItem): number {
  const at = a.createdAt ?? '￿'
  const bt = b.createdAt ?? '￿'
  if (at !== bt) return at < bt ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Makes the folder hold exactly one usable copy of every card: adds missing
 * or errored cards, removes errored and duplicate copies. Throws only when
 * listing fails or the folder looks wrong (then it adds nothing).
 */
export async function seedFolder(
  kb: KnowledgeApi,
  cards: readonly MisconceptionCard[] = MISCONCEPTION_CARDS,
  folder: string = KNOWLEDGE.folder,
): Promise<SeedReport> {
  const items = await listFolder(kb, folder)

  const copiesById = new Map<string, KnowledgeItem[]>()
  for (const item of items) {
    const id = cardIdOfKey(item.key)
    if (!id) continue
    copiesById.set(id, [...(copiesById.get(id) ?? []), item])
  }
  // Runaway guards: if keys don't parse the way we expect, or the folder has
  // grown far past the card count, adding more would only pile up duplicates.
  if (items.length > 0 && copiesById.size === 0) {
    throw new Error(`no recognizable card keys in ${folder} (e.g. "${items[0]?.key ?? ''}"); not seeding`)
  }
  if (items.length >= cards.length * 3) {
    throw new Error(`${folder} holds ${items.length} items for ${cards.length} cards; not seeding`)
  }

  const toAdd: MisconceptionCard[] = []
  const toRemove: string[] = []
  for (const card of cards) {
    const copies = [...(copiesById.get(card.id) ?? [])].sort(keepOrder)
    const keep = copies.find((item) => item.status !== 'error')
    if (!keep) toAdd.push(card)
    toRemove.push(...copies.filter((item) => item !== keep).map((item) => item.id))
  }

  const [adds, removes] = await Promise.all([
    Promise.allSettled(
      toAdd.map((card) =>
        kb.add(new File([renderCardMarkdown(card)], cardFileName(card.id), { type: 'text/markdown' }), { folder }),
      ),
    ),
    Promise.allSettled(toRemove.map((itemId) => kb.remove(itemId))),
  ])

  return {
    listed: items.length,
    added: toAdd.filter((_, i) => adds[i]?.status === 'fulfilled').map((card) => card.id),
    failed: toAdd.filter((_, i) => adds[i]?.status === 'rejected').map((card) => card.id),
    // A failed remove only leaves a harmless duplicate for the next pass.
    removed: removes.filter((result) => result.status === 'fulfilled').length,
  }
}

function describeSeed(report: SeedReport): string {
  const parts = [`listed:${report.listed}`]
  if (report.added.length) parts.push(`added:${report.added.length}`)
  if (report.removed) parts.push(`removed:${report.removed}`)
  if (report.failed.length) parts.push(`failed:${report.failed.join('+')}`)
  return parts.join(',')
}

// ── Retrieval ───────────────────────────────────────────────────────────────

function cardForChunk(chunk: KnowledgeSearchChunk): MisconceptionCard | undefined {
  const id = cardIdOfKey(chunk.filename) ?? cardIdOfKey(chunk.key)
  if (id) return misconceptionById(id)
  // Fallback: each card's heading carries its unique kid-words line.
  return MISCONCEPTION_CARDS.find((card) => chunk.text.includes(card.kidWords))
}

/** Above the cutoff, one hit per card (its best chunk), best first, top K. */
export function pickHits(
  chunks: readonly KnowledgeSearchChunk[],
  topK: number = KNOWLEDGE.topK,
  minScore: number = KNOWLEDGE.minScore,
): MisconceptionHit[] {
  const best = new Map<string, MisconceptionHit>()
  for (const chunk of chunks) {
    if (!(chunk.score >= minScore)) continue
    const card = cardForChunk(chunk)
    if (!card) continue
    const seen = best.get(card.id)
    if (!seen || chunk.score > seen.score) best.set(card.id, { card, score: chunk.score })
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, topK)
}

async function searchFolder(
  kb: KnowledgeApi,
  question: string,
  folder: string,
): Promise<{ hits: MisconceptionHit[]; chunks: number }> {
  const query = question.trim().slice(0, 1_000)
  if (!query) return { hits: [], chunks: 0 }
  const { chunks } = await kb.search(query, {
    folder,
    mode: KNOWLEDGE.mode,
    limit: KNOWLEDGE.searchLimit,
    matchThreshold: KNOWLEDGE.minScore,
  })
  return { hits: pickHits(chunks), chunks: chunks.length }
}

// ── The lookup the job calls ────────────────────────────────────────────────

/** The SDK takes no AbortSignal, so a slow call is raced, not canceled. */
function within<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function describeError(err: unknown): string {
  if (err instanceof KnowledgeError) return `${err.status} ${err.code}`
  return shortMessage(err, 120)
}

/**
 * A lookup with its own per-isolate seed memo. Each call runs the seed check
 * (a no-op after the first clean pass) alongside the search, so neither waits
 * on the other; awaiting both keeps the job alive until a first seed lands.
 */
export function createMisconceptionFinder(
  kb: KnowledgeApi,
  folder: string = KNOWLEDGE.folder,
): (question: string) => Promise<MisconceptionLookup> {
  let seeded = false
  let inflight: Promise<SeedReport> | null = null
  let failedAt = Number.NEGATIVE_INFINITY

  const seed = (): Promise<string> => {
    if (seeded) return Promise.resolve('cached')
    let run = inflight
    if (!run) {
      if (Date.now() - failedAt < KNOWLEDGE.seedRetryAfterMs) return Promise.resolve('cooldown')
      run = seedFolder(kb, MISCONCEPTION_CARDS, folder)
      inflight = run
      void run
        .then(
          (report) => {
            if (report.failed.length === 0) seeded = true
            else failedAt = Date.now()
          },
          () => {
            failedAt = Date.now()
          },
        )
        .finally(() => {
          inflight = null
        })
    }
    return run.then(describeSeed)
  }

  return async (question) => {
    const started = Date.now()
    const [seedOutcome, searchOutcome] = await Promise.allSettled([
      within(seed(), KNOWLEDGE.seedTimeoutMs, 'seed'),
      within(searchFolder(kb, question, folder), KNOWLEDGE.searchTimeoutMs, 'search'),
    ])
    const seedState = seedOutcome.status === 'fulfilled' ? seedOutcome.value : `error(${describeError(seedOutcome.reason)})`
    const tail = `seed=${seedState} ${Date.now() - started}ms`
    if (searchOutcome.status === 'rejected') {
      return { hits: [], summary: `unavailable search=error(${describeError(searchOutcome.reason)}) ${tail}` }
    }
    const { hits, chunks } = searchOutcome.value
    const ids = hits.length ? hits.map((hit) => `${hit.card.id}@${hit.score.toFixed(2)}`).join(',') : 'none'
    return { hits, summary: `hits=${ids} chunks=${chunks} ${tail}` }
  }
}

let shared: ((question: string) => Promise<MisconceptionLookup>) | null = null

/**
 * Misconception cards relevant to a kid's question, for the writer and the
 * checker. Never throws; an unavailable knowledge base means zero hits.
 */
export async function findMisconceptions(env: KnowledgeEnv, question: string): Promise<MisconceptionLookup> {
  try {
    shared ??= createMisconceptionFinder(knowledge(env))
    return await shared(question)
  } catch (err) {
    return { hits: [], summary: `unavailable error(${describeError(err)})` }
  }
}
