/**
 * Kurious contract: the shape of a card, shared by the worker and the UI.
 *
 * Owned by the main agent. Tracks build against this file and ask the main
 * agent for changes; they never edit it themselves.
 *
 * A card is ONE picture + ONE paragraph (read aloud) + 2-3 "But why?"
 * follow-ups. Cards are written only by the worker; clients only read them.
 */

// ── Collection ──────────────────────────────────────────────────────────────

export const CARDS_COLLECTION = 'cards'

// ── Age bands ───────────────────────────────────────────────────────────────

export const AGE_BANDS = ['little', 'kid', 'big'] as const
export type AgeBand = (typeof AGE_BANDS)[number]

export const DEFAULT_AGE_BAND: AgeBand = 'little'

/** What grown-ups see on the age control and the card's age chip. */
export const AGE_BAND_LABELS: Record<AgeBand, { name: string; ages: string }> = {
  little: { name: 'Little', ages: '4-5' },
  kid: { name: 'Kid', ages: '6-8' },
  big: { name: 'Big kid', ages: '9-11' },
}

export function isAgeBand(value: unknown): value is AgeBand {
  return typeof value === 'string' && (AGE_BANDS as readonly string[]).includes(value)
}

// ── Status ──────────────────────────────────────────────────────────────────

/**
 * queued -> writing -> [checking] -> illustrating -> ready
 *                \-> declined (safety gate)
 * any stage -> error
 *
 * `illustrating` covers the picture and the narration, which run in parallel;
 * the UI tells them apart by which of imageUrl / audioUrl has arrived.
 */
export const CARD_STATUSES = [
  'queued',
  'writing',
  'checking',
  'illustrating',
  'ready',
  'declined',
  'error',
] as const
export type CardStatus = (typeof CARD_STATUSES)[number]

export const GENERATING_STATUSES: readonly CardStatus[] = [
  'queued',
  'writing',
  'checking',
  'illustrating',
]

export function isGenerating(status: CardStatus): boolean {
  return GENERATING_STATUSES.includes(status)
}

/**
 * A card still generating this long after its last update is treated as
 * failed (show the error state with Retry). A crashed job only releases
 * itself after ~16 minutes (spike S4).
 */
export const STALE_AFTER_MS = 3 * 60_000

export function isStale(card: { status: CardStatus; updatedAt: string }, now = Date.now()): boolean {
  return isGenerating(card.status) && now - Date.parse(card.updatedAt) > STALE_AFTER_MS
}

// ── Pieces ──────────────────────────────────────────────────────────────────

/** ok: answer normally. gentle: answer softly, keep off the Wall. decline: don't answer. */
export const SAFETY_LABELS = ['ok', 'gentle', 'decline'] as const
export type SafetyLabel = (typeof SAFETY_LABELS)[number]

export interface CardSafety {
  label: SafetyLabel
  /** The question contains personal info (a name, school, address...). Never public. */
  personal: boolean
}

/** The cross-provider checker's verdict (P1). Null until the checker has run. */
export interface CardCheck {
  verdict: 'pass' | 'fail'
  issues: string[]
  checkerModel: string
  /** 0 or 1: the writer gets one rewrite after a failed check. */
  rewrites: number
}

export type CardWall = 'private' | 'public'

/** One earlier stop on the trail, for the breadcrumb. */
export interface TrailStop {
  cardId: string
  question: string
}

// ── The record ──────────────────────────────────────────────────────────────

/**
 * The `data` of a `cards` record. Read it from a `RecordData<CardData>`
 * envelope (`useQuery`), which also carries recordId, createdBy, createdAt and
 * updatedAt, so those are not repeated here.
 *
 * Fields fill in as the job runs (progressive reveal): paragraph, keyIdea and
 * followUps land together; imageUrl and audioUrl land independently.
 */
export interface CardData {
  ownerId: string
  /** As the kid asked it, trimmed. */
  question: string
  /** normalizeQuestion(question): the exact-match reuse key, with ageBand. */
  normalizedQuestion: string
  ageBand: AgeBand
  status: CardStatus

  paragraph: string | null
  /** One short sentence: the single idea the paragraph teaches. */
  keyIdea: string | null
  /** 2-3 "But why?" questions once written; [] before. */
  followUps: string[]
  imagePrompt: string | null
  /** Null until painted. Can stay null on a ready card if the picture failed. */
  imageUrl: string | null
  /** Null until recorded. Can stay null on a ready card if narration failed. */
  audioUrl: string | null

  /** The card whose follow-up chip created this one. Null for a fresh question. */
  parentCardId: string | null
  /** The first card of the trail. Null for a fresh question (it IS the root): group by `rootCardId ?? recordId`. */
  rootCardId: string | null
  /** Earlier stops, root first, not including this card. [] for a fresh question. */
  trail: TrailStop[]

  safety: CardSafety | null
  check: CardCheck | null
  writerModel: string | null
  /** Set when this card was copied from an existing card (exact-match reuse, P1). */
  reusedFromCardId: string | null

  /**
   * Set only by the worker, once, when the card reaches `ready`: 'public' when
   * safety is `ok`, nothing personal, the check passed (once the checker
   * ships) and there is a picture. The Wall and share links show only these.
   * Text, not boolean: boolean columns are stored as 0/1 and don't filter
   * reliably (spike S4).
   */
  wall: CardWall
  /** Short reason for logs and grown-ups. Kids see fixed, friendly copy. */
  errorMessage: string | null
}

/** A fresh `queued` card, before the job touches it. */
export function newCardData(
  input: Pick<CardData, 'ownerId' | 'question' | 'ageBand'> &
    Partial<Pick<CardData, 'parentCardId' | 'rootCardId' | 'trail'>>,
): CardData {
  return {
    ownerId: input.ownerId,
    question: input.question.trim(),
    normalizedQuestion: normalizeQuestion(input.question),
    ageBand: input.ageBand,
    status: 'queued',
    paragraph: null,
    keyIdea: null,
    followUps: [],
    imagePrompt: null,
    imageUrl: null,
    audioUrl: null,
    parentCardId: input.parentCardId ?? null,
    rootCardId: input.rootCardId ?? null,
    trail: input.trail ?? [],
    safety: null,
    check: null,
    writerModel: null,
    reusedFromCardId: null,
    wall: 'private',
    errorMessage: null,
  }
}

// ── Questions ───────────────────────────────────────────────────────────────

export const QUESTION_MIN_CHARS = 3
export const QUESTION_MAX_CHARS = 160

/** Lowercase, drop punctuation, collapse spaces: "Why is the sky BLUE?!" -> "why is the sky blue". */
export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── What the UI renders ─────────────────────────────────────────────────────

/** The one shape every card component takes, for owner records and public cards alike. */
export interface CardView {
  id: string
  question: string
  ageBand: AgeBand
  status: CardStatus
  paragraph: string | null
  keyIdea: string | null
  followUps: string[]
  imageUrl: string | null
  audioUrl: string | null
  trail: TrailStop[]
  /** Show the "Checked" badge. */
  checked: boolean
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export function toCardView(record: {
  recordId: string
  data: CardData
  createdAt: string
  updatedAt: string
}): CardView {
  const d = record.data
  return {
    id: record.recordId,
    question: d.question,
    ageBand: d.ageBand,
    status: d.status,
    paragraph: d.paragraph,
    keyIdea: d.keyIdea,
    followUps: d.followUps,
    imageUrl: d.imageUrl,
    audioUrl: d.audioUrl,
    trail: d.trail,
    checked: d.check?.verdict === 'pass',
    isPublic: d.wall === 'public',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

/** Generating-screen stage row: Thinking -> Checking -> Painting -> Recording. */
export type CardStage = 'thinking' | 'checking' | 'painting' | 'recording' | 'done'

export function cardStage(card: Pick<CardView, 'status' | 'imageUrl' | 'audioUrl'>): CardStage {
  switch (card.status) {
    case 'queued':
    case 'writing':
      return 'thinking'
    case 'checking':
      return 'checking'
    case 'illustrating':
      return card.imageUrl ? 'recording' : 'painting'
    default:
      return 'done'
  }
}

// ── API ─────────────────────────────────────────────────────────────────────

/** POST. Signed-in only. Creates a card (or reuses one) and starts the job. */
export const ASK_ROUTE = '/api/ask'

export interface AskRequest {
  question: string
  ageBand: AgeBand
  /** Set when a "But why?" chip was tapped on this card. */
  parentCardId?: string
}

export interface AskResponse {
  ok: true
  cardId: string
  /** True when an existing card was reused for free (P1). */
  reused: boolean
  /** New cards the user can still ask for today. */
  remainingToday: number
}

export const ASK_ERROR_CODES = [
  'unauthenticated',
  'daily_cap_reached',
  'invalid_question',
  'parent_not_found',
  'server_error',
] as const
export type AskErrorCode = (typeof ASK_ERROR_CODES)[number]

export interface AskError {
  ok: false
  error: AskErrorCode
  /** Grown-up-readable; the UI shows its own kid-friendly copy per code. */
  message: string
}

/** POST. Signed-in owner only. Re-runs the job for a card in `error`. */
export const retryRoute = (cardId: string) => `/api/cards/${encodeURIComponent(cardId)}/retry`

/**
 * GET. Public, no sign-in. Newest first. Card records stay owner-read-only;
 * the Wall and shared cards go through worker routes that return CardView,
 * so ownerId and safety details never leave the worker.
 */
export const WALL_ROUTE = '/api/wall'

export interface WallQuery {
  cursor?: string
  /** Default 12, max 30. */
  limit?: number
}

export interface WallPage {
  items: CardView[]
  nextCursor: string | null
}

/** GET. Public. A shared card: 404 unless the card is public. Owners use their live record instead. */
export const publicCardRoute = (cardId: string) => `/api/cards/${encodeURIComponent(cardId)}`

export type PublicCardResponse = { ok: true; card: CardView } | { ok: false; error: 'not_found' }
