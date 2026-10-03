import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  KnowledgeAddOptions,
  KnowledgeAddResult,
  KnowledgeItem,
  KnowledgeListOptions,
  KnowledgeListResult,
  KnowledgeSearchChunk,
  KnowledgeSearchOptions,
  KnowledgeSearchResult,
} from 'deepspace/worker'
import { KNOWLEDGE } from '../config'
import { checkerPrompt, writerPrompt } from '../ai/prompts'
import { cardFileName, MISCONCEPTION_CARDS, renderCardMarkdown } from './misconceptions'
import { createMisconceptionFinder, pickHits, seedFolder, type KnowledgeApi } from './lookup'

const FOLDER = KNOWLEDGE.folder
const words = (text: string) => text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length

class FakeKb implements KnowledgeApi {
  items: KnowledgeItem[] = []
  uploads: { name: string; folder: string | undefined; type: string; text: Promise<string> }[] = []
  removed: string[] = []
  listCalls = 0
  searchCalls: { query: string; options: KnowledgeSearchOptions | undefined }[] = []
  chunks: KnowledgeSearchChunk[] = []
  searchImpl: (() => Promise<KnowledgeSearchResult>) | null = null
  listError: Error | null = null
  private next = 1

  async add(file: File, options?: KnowledgeAddOptions): Promise<KnowledgeAddResult> {
    this.uploads.push({ name: file.name, folder: options?.folder, type: file.type, text: file.text() })
    const item: KnowledgeItem = {
      id: `item${this.next++}`,
      key: `${options?.folder ?? ''}/${file.name}`,
      status: 'queued',
      createdAt: new Date(Date.UTC(2026, 9, 3, 0, 0, this.next)).toISOString(),
    }
    this.items.push(item)
    return { items: [item] }
  }

  async list(options?: KnowledgeListOptions): Promise<KnowledgeListResult> {
    this.listCalls++
    if (this.listError) throw this.listError
    const perPage = options?.perPage ?? 20
    const page = options?.page ?? 1
    const slice = this.items.slice((page - 1) * perPage, page * perPage)
    return { items: slice, page, perPage, total: this.items.length, totalPages: Math.ceil(this.items.length / perPage) }
  }

  async remove(itemId: string): Promise<void> {
    this.removed.push(itemId)
    this.items = this.items.filter((item) => item.id !== itemId)
  }

  async search(query: string, options?: KnowledgeSearchOptions): Promise<KnowledgeSearchResult> {
    this.searchCalls.push({ query, options })
    if (this.searchImpl) return this.searchImpl()
    return { chunks: this.chunks }
  }
}

const chunk = (id: string, score: number, extra: Partial<KnowledgeSearchChunk> = {}): KnowledgeSearchChunk => ({
  id: `chunk-${id}-${score}`,
  score,
  text: '',
  filename: cardFileName(id),
  ...extra,
})

afterEach(() => {
  vi.useRealTimers()
})

describe('misconception cards', () => {
  it('has about 25 cards with unique, key-safe ids', () => {
    expect(MISCONCEPTION_CARDS.length).toBeGreaterThanOrEqual(24)
    const ids = MISCONCEPTION_CARDS.map((card) => card.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(`${FOLDER}/${cardFileName(id)}`.length).toBeLessThanOrEqual(128)
    }
  })

  it('keeps every card complete and under ~120 words', () => {
    for (const card of MISCONCEPTION_CARDS) {
      for (const field of [card.topic, card.kidWords, card.wrong, card.right, card.whyKidsThinkIt, card.sayInstead]) {
        expect(field.trim(), card.id).not.toBe('')
      }
      expect(card.triggers.length, card.id).toBeGreaterThanOrEqual(3)
      // The prompt never sees Triggers; the indexed card (with them) stays small too.
      const markdown = renderCardMarkdown(card)
      const withoutTriggers = markdown.replace(/^- \*\*Triggers:\*\*.*$/m, '')
      expect(words(withoutTriggers), card.id).toBeLessThanOrEqual(120)
      expect(words(markdown), card.id).toBeLessThanOrEqual(160)
    }
  })

  it('uses unique kid-words (the search fallback matches on them)', () => {
    const lines = MISCONCEPTION_CARDS.map((card) => card.kidWords)
    expect(new Set(lines).size).toBe(lines.length)
    for (const line of lines) {
      expect(lines.filter((other) => other !== line && other.includes(line))).toEqual([])
    }
  })
})

describe('seedFolder', () => {
  it('adds every card to an empty folder as <id>.md markdown', async () => {
    const kb = new FakeKb()
    const report = await seedFolder(kb)
    expect(report.listed).toBe(0)
    expect(report.added).toHaveLength(MISCONCEPTION_CARDS.length)
    expect(report.failed).toEqual([])
    expect(kb.uploads.every((upload) => upload.folder === FOLDER && upload.type === 'text/markdown')).toBe(true)
    expect(kb.uploads.map((upload) => upload.name).sort()).toEqual(
      MISCONCEPTION_CARDS.map((card) => cardFileName(card.id)).sort(),
    )
    const first = kb.uploads.find((upload) => upload.name === cardFileName('seasons-distance'))
    expect(await first?.text).toContain('- **Wrong:** Seasons happen because Earth moves closer')
  })

  it('is idempotent: a full folder adds and removes nothing', async () => {
    const kb = new FakeKb()
    await seedFolder(kb)
    kb.uploads = []
    const report = await seedFolder(kb)
    expect(report).toEqual({ listed: MISCONCEPTION_CARDS.length, added: [], failed: [], removed: 0 })
    expect(kb.uploads).toEqual([])
  })

  it('removes duplicate copies, keeping the oldest, and re-adds errored cards', async () => {
    const kb = new FakeKb()
    await seedFolder(kb)
    const original = kb.items.find((item) => item.key.endsWith('/bats-blind.md'))
    // A concurrent seed uploaded bats-blind again; sky-ocean failed to index.
    await kb.add(new File(['dup'], 'bats-blind.md', { type: 'text/markdown' }), { folder: FOLDER })
    const duplicate = kb.items.at(-1)
    const errored = kb.items.find((item) => item.key.endsWith('/sky-ocean.md'))
    if (!original || !duplicate || !errored) throw new Error('fixture setup failed')
    errored.status = 'error'
    kb.uploads = []

    const report = await seedFolder(kb)
    expect(report.added).toEqual(['sky-ocean'])
    expect(report.removed).toBe(2)
    expect(kb.removed.sort()).toEqual([duplicate.id, errored.id].sort())
    expect(kb.items.some((item) => item.id === original.id)).toBe(true)
  })

  it('adds nothing when the folder keys are unrecognizable', async () => {
    const kb = new FakeKb()
    kb.items = [{ id: 'x1', key: 'opaque-key-1', status: 'completed' }]
    await expect(seedFolder(kb)).rejects.toThrow(/not seeding/)
    expect(kb.uploads).toEqual([])
  })
})

describe('pickHits', () => {
  it('applies the cutoff, keeps each card once (best score), best first, top K', () => {
    const hits = pickHits([
      chunk('seasons-distance', 0.62),
      chunk('summer-closest', 0.71),
      chunk('seasons-distance', 0.8, { filename: undefined, key: `${FOLDER}/seasons-distance.md` }),
      chunk('tilt-rocks', 0.55),
      chunk('sky-ocean', 0.3),
      chunk('not-a-card', 0.99),
      { id: 'c-text', score: 0.5, text: '# Moon: "The moon changes shape because Earth\'s shadow covers it"' },
    ])
    expect(hits.map((hit) => [hit.card.id, hit.score])).toEqual([
      ['seasons-distance', 0.8],
      ['summer-closest', 0.71],
      ['tilt-rocks', 0.55],
    ])
    expect(pickHits([chunk('sky-ocean', 0.3)])).toEqual([])
    expect(pickHits([{ id: 'c', score: 0.9, text: 'Cave people lived with dinosaurs' }])[0]?.card.id).toBe('dinosaurs-people')
  })
})

describe('createMisconceptionFinder', () => {
  it('seeds once per isolate, searches the folder semantically, and reports hits', async () => {
    const kb = new FakeKb()
    kb.chunks = [chunk('seasons-distance', 0.74), chunk('summer-closest', 0.6)]
    const find = createMisconceptionFinder(kb)

    const first = await find('Why is it hot in summer?')
    expect(first.hits.map((hit) => hit.card.id)).toEqual(['seasons-distance', 'summer-closest'])
    expect(first.summary).toMatch(/^hits=seasons-distance@0\.74,summer-closest@0\.60 chunks=2 seed=listed:0,added:\d+ \d+ms$/)
    expect(kb.searchCalls[0]?.options).toMatchObject({
      folder: FOLDER,
      mode: 'semantic',
      limit: KNOWLEDGE.searchLimit,
      matchThreshold: KNOWLEDGE.minScore,
    })

    const second = await find('Why is winter cold?')
    expect(second.summary).toContain('seed=cached')
    expect(kb.listCalls).toBe(1)
  })

  it('fails open: a search error or timeout means no hits, never a throw', async () => {
    const kb = new FakeKb()
    kb.searchImpl = () => Promise.reject(new Error('boom'))
    const find = createMisconceptionFinder(kb)
    const failed = await find('Why is the sky blue?')
    expect(failed.hits).toEqual([])
    expect(failed.summary).toMatch(/^unavailable search=error\(boom\) seed=listed:0,added:\d+/)

    vi.useFakeTimers()
    kb.searchImpl = () => new Promise<KnowledgeSearchResult>(() => undefined)
    const pending = find('Why is the sky blue?')
    await vi.advanceTimersByTimeAsync(KNOWLEDGE.searchTimeoutMs + 10)
    const timedOut = await pending
    expect(timedOut.hits).toEqual([])
    expect(timedOut.summary).toMatch(/search=error\(search timed out/)
  })

  it('backs off after a failed seed and still searches', async () => {
    const kb = new FakeKb()
    kb.listError = new Error('list down')
    kb.chunks = [chunk('bats-blind', 0.9)]
    const find = createMisconceptionFinder(kb)

    const first = await find('Are bats blind?')
    expect(first.hits.map((hit) => hit.card.id)).toEqual(['bats-blind'])
    expect(first.summary).toContain('seed=error(list down)')

    const second = await find('Are bats blind?')
    expect(second.summary).toContain('seed=cooldown')
    expect(kb.listCalls).toBe(1)
  })
})

describe('prompts', () => {
  const cards = MISCONCEPTION_CARDS.filter((card) => card.id === 'seasons-distance')

  it('adds nothing when no cards were retrieved', () => {
    expect(writerPrompt('Why is it hot in summer?')).toBe('<question>Why is it hot in summer?</question>')
  })

  it('wraps retrieved cards as tagged data for the writer (with Say instead) and the checker (without)', () => {
    const writer = writerPrompt('Why is it hot in summer?', cards)
    expect(writer).toContain('<misconceptions>\n<misconception id="seasons-distance" topic="Seasons">')
    expect(writer).toContain('Say instead:')
    const checker = checkerPrompt(
      'Why is it hot in summer?',
      { paragraph: 'p', keyIdea: 'k', followUps: ['a', 'b'], imagePrompt: 'i' },
      cards,
    )
    expect(checker).toContain('Wrong: Seasons happen because Earth moves closer')
    expect(checker).not.toContain('Say instead:')
    expect(checker).toContain('</misconceptions>')
  })
})
