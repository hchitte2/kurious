/**
 * Sample cards in every status, for building the UI before the pipeline is
 * wired (Block 2). Shaped exactly like `useQuery<CardData>('cards')` records,
 * so switching to live data in Block 3 is a one-line change.
 *
 * Pictures are inline SVG scenes and narration is a short generated tone, so
 * fixtures work offline and never hit storage.
 */

import type { RecordData } from 'deepspace'
import {
  type CardData,
  type CardStatus,
  type CardView,
  type WallPage,
  newCardData,
  toCardView,
} from '../shared/card'

// ── Placeholder media ───────────────────────────────────────────────────────

/** A 4:3 picture-book-ish scene in the app palette. */
function scene(opts: { sky: string; ground: string; orb: string; orbY?: number }): string {
  const orbY = opts.orbY ?? 170
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
<rect width="800" height="600" fill="${opts.sky}"/>
<circle cx="560" cy="${orbY}" r="80" fill="${opts.orb}"/>
<path d="M0 430 Q200 340 420 420 T800 400 V600 H0Z" fill="${opts.ground}"/>
<path d="M0 500 Q260 440 520 500 T800 490 V600 H0Z" fill="#1E2A44" opacity="0.12"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** A soft 1.5s tone as a WAV data URI, so the play button has something to play. */
function toneWav(seconds = 1.5, hz = 392): string {
  const rate = 8000
  const n = Math.floor(rate * seconds)
  const bytes = new Uint8Array(44 + n)
  const view = new DataView(bytes.buffer)
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) bytes[offset + i] = s.charCodeAt(i)
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + n, true)
  ascii(8, 'WAVEfmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate, true) // byte rate
  view.setUint16(32, 1, true) // block align
  view.setUint16(34, 8, true) // 8-bit
  ascii(36, 'data')
  view.setUint32(40, n, true)
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, i / 400, (n - i) / 1600)
    bytes[44 + i] = 128 + Math.round(40 * fade * Math.sin((2 * Math.PI * hz * i) / rate))
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

const TONE = toneWav()

const PICTURES = {
  sky: scene({ sky: '#5BB6F0', ground: '#3FA86B', orb: '#FFD23F' }),
  sunset: scene({ sky: '#FF8A3D', ground: '#E06A1F', orb: '#FFD23F', orbY: 360 }),
  night: scene({ sky: '#18203A', ground: '#3FA86B', orb: '#FFF8EC', orbY: 120 }),
  volcano: scene({ sky: '#FBEFD9', ground: '#4A5672', orb: '#FF8A3D', orbY: 300 }),
  zebra: scene({ sky: '#FFD23F', ground: '#3FA86B', orb: '#FFF8EC' }),
}

// ── Builders ────────────────────────────────────────────────────────────────

const OWNER = 'user_fixture_grownup'
const SONNET = 'claude-sonnet-5'
/** Relative to page load, so generating fixtures aren't `isStale` (until 3 min after a reload). */
const BASE_TIME = Date.now()

function record(
  recordId: string,
  minutesAgo: number,
  data: Partial<CardData> & Pick<CardData, 'question' | 'ageBand' | 'status'>,
): RecordData<CardData> {
  const at = new Date(BASE_TIME - minutesAgo * 60_000).toISOString()
  return {
    recordId,
    createdBy: OWNER,
    createdAt: at,
    updatedAt: at,
    data: { ...newCardData({ ownerId: OWNER, question: data.question, ageBand: data.ageBand }), ...data },
  }
}

const passed = (rewrites = 0) => ({
  verdict: 'pass' as const,
  issues: [],
  checkerModel: 'gpt-6-sol',
  rewrites,
})
const safe = { label: 'ok' as const, personal: false }

// ── The trail: sky -> sunset -> where does the sun go ──────────────────────

const sky = record('fx-sky', 30, {
  question: 'Why is the sky blue?',
  ageBand: 'little',
  status: 'ready',
  paragraph:
    'Sunlight looks white, but it is really all the colors mixed together. When sunlight zooms into the air, it bumps into tiny bits of air that are much too small to see. Blue light gets bounced around the most, so blue comes at you from all over the sky!',
  keyIdea: 'Air bounces blue light all around the sky more than the other colors.',
  followUps: ['Why is the sunset orange?', 'Why does sunlight have colors in it?', 'Why is space dark?'],
  imagePrompt: 'Sunbeams scattering into a bright blue sky over green hills, a child looking up',
  imageUrl: PICTURES.sky,
  audioUrl: TONE,
  safety: safe,
  check: passed(),
  writerModel: SONNET,
  wall: 'public',
})

const sunset = record('fx-sunset', 28, {
  question: 'Why is the sunset orange?',
  ageBand: 'little',
  status: 'ready',
  paragraph:
    "When the sun is low, its light has to travel through lots more air to reach you. On that long trip, most of the blue light gets bounced away. The oranges and reds keep going, so the sky near the sun glows orange!",
  keyIdea: 'Sunset light travels through so much air that the blue gets bounced away.',
  followUps: ['Where does the sun go at night?', 'Why do clouds turn pink at sunset?'],
  imagePrompt: 'A big low sun over orange hills at sunset',
  imageUrl: PICTURES.sunset,
  audioUrl: TONE,
  parentCardId: 'fx-sky',
  rootCardId: 'fx-sky',
  trail: [{ cardId: 'fx-sky', question: 'Why is the sky blue?' }],
  safety: safe,
  check: passed(1),
  writerModel: SONNET,
  wall: 'public',
})

/** The newest stop on the trail, mid-generation: paragraph is in, picture is painting. */
const sunNight = record('fx-sun-night', 1, {
  question: 'Where does the sun go at night?',
  ageBand: 'little',
  status: 'illustrating',
  paragraph:
    "The sun doesn't go anywhere! Our Earth is always spinning, like a very slow top. At night, your side of Earth has turned away from the sun, so it gets dark. Right now, kids on the other side of the world are having daytime!",
  keyIdea: 'Night happens when our side of the spinning Earth faces away from the sun.',
  followUps: ['Why does the Earth spin?', 'Why can we see the moon in the daytime?'],
  imagePrompt: 'A cozy round Earth spinning, one side sunny and one side starry',
  parentCardId: 'fx-sunset',
  rootCardId: 'fx-sky',
  trail: [
    { cardId: 'fx-sky', question: 'Why is the sky blue?' },
    { cardId: 'fx-sunset', question: 'Why is the sunset orange?' },
  ],
  safety: safe,
  check: passed(),
  writerModel: SONNET,
})

// ── One of every other status ───────────────────────────────────────────────

const queued = record('fx-queued', 0, {
  question: 'Why do cats purr?',
  ageBand: 'kid',
  status: 'queued',
})

const writing = record('fx-writing', 0, {
  question: 'Why do we have to sleep?',
  ageBand: 'little',
  status: 'writing',
  safety: safe,
})

const checking = record('fx-checking', 2, {
  question: 'Why do leaves change color?',
  ageBand: 'kid',
  status: 'checking',
  paragraph:
    "Leaves are green because they are full of chlorophyll, the stuff that helps them turn sunlight into food. In fall, the days get shorter and trees stop making chlorophyll. As the green fades, the yellows and oranges that were hiding in the leaf all along finally show. Some trees even make brand-new reds!",
  keyIdea: 'When the green fades in fall, colors that were hiding in the leaf show through.',
  followUps: ['Why do trees drop their leaves?', 'Why are plants green?', 'How do leaves make food?'],
  imagePrompt: 'A tree with green, yellow, orange and red leaves drifting down',
  safety: safe,
  writerModel: SONNET,
})

/** Picture is in, narration still recording. */
const recording = record('fx-volcano', 3, {
  question: 'Why do volcanoes erupt?',
  ageBand: 'big',
  status: 'illustrating',
  paragraph:
    "Deep underground it is so hot that some rock melts into thick, glowing magma. Magma is lighter than the solid rock around it, so it slowly pushes upward, carrying gas bubbles a bit like the fizz in a soda. When enough magma and gas squeeze up through cracks in Earth's crust, the pressure bursts out at the surface. That's an eruption, and once the magma reaches the air, we call it lava.",
  keyIdea: 'Hot, light magma and its gas push up until the pressure bursts out.',
  followUps: ['Why is it so hot inside the Earth?', 'Why do some volcanoes stay quiet for years?'],
  imagePrompt: 'A friendly cone volcano puffing glowing lava under a warm sky',
  imageUrl: PICTURES.volcano,
  safety: safe,
  check: passed(),
  writerModel: SONNET,
})

/** Ready but the checker never passed it: no badge, never public. Narration failed. */
const unchecked = record('fx-zebra', 45, {
  question: 'Why do zebras have stripes?',
  ageBand: 'kid',
  status: 'ready',
  paragraph:
    "Scientists are still figuring this out! The best idea so far is about flies. Biting flies have a hard time landing on stripes, so they zoom past or bump off instead. That means fewer itchy bites for zebras. Stripes might help in other ways too, and scientists keep testing new ideas.",
  keyIdea: 'Stripes seem to make it hard for biting flies to land.',
  followUps: ['Why do flies bite?', 'Is a zebra black or white underneath?'],
  imagePrompt: 'A zebra in tall grass while confused flies drift around it',
  imageUrl: PICTURES.zebra,
  safety: safe,
  check: {
    verdict: 'fail',
    issues: ['States the fly idea more confidently than the evidence supports for 6-8 readers.'],
    checkerModel: 'gpt-6-sol',
    rewrites: 1,
  },
  writerModel: SONNET,
})

const declined = record('fx-declined', 10, {
  question: 'Why does my tummy hurt every day?',
  ageBand: 'little',
  status: 'declined',
  safety: { label: 'decline', personal: true },
})

/** Failed after writing: the paragraph stays visible, with a Retry. */
const errorPartial = record('fx-error-partial', 6, {
  question: 'Why is the ocean salty?',
  ageBand: 'big',
  status: 'error',
  paragraph:
    "Rain slowly wears away tiny bits of rock, and rivers carry those bits, including salt, down to the sea. When the sun warms the ocean, water rises into the air as vapor, but the salt can't go with it, so it stays behind. Rivers have been delivering salt for millions of years, so the ocean is salty and the rivers taste fresh.",
  keyIdea: 'Rivers bring salt to the sea, and the sun lifts away only the water.',
  followUps: ['Why is rain not salty?', 'Is the ocean getting saltier?'],
  imagePrompt: 'Rivers winding down to a sparkling sea under a warm sun',
  safety: safe,
  writerModel: SONNET,
  errorMessage: 'image: integration timed out',
})

/** Failed before anything was written. */
const errorEmpty = record('fx-error-empty', 5, {
  question: 'Why do birds sing?',
  ageBand: 'kid',
  status: 'error',
  safety: safe,
  errorMessage: 'writer: request failed',
})

// ── Exports ─────────────────────────────────────────────────────────────────

/** Every fixture record, newest first. */
export const fixtureCards: RecordData<CardData>[] = [
  queued,
  writing,
  sunNight,
  checking,
  recording,
  errorEmpty,
  errorPartial,
  declined,
  sunset,
  sky,
  unchecked,
].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

/** One representative card per status, for a states gallery. */
export const fixtureByStatus: Record<CardStatus, RecordData<CardData>> = {
  queued,
  writing,
  checking,
  illustrating: sunNight,
  ready: sky,
  declined,
  error: errorPartial,
}

/** Extra edge cases beyond one-per-status. */
export const fixtureEdgeCases = {
  /** illustrating with the picture in and narration still recording */
  recording,
  /** ready, failed check, no audio: no badge, not public */
  unchecked,
  /** error before anything was written */
  errorEmpty,
}

/** The trail sky -> sunset -> sun at night (the last one still generating). */
export const fixtureTrailIds = ['fx-sky', 'fx-sunset', 'fx-sun-night'] as const

export const fixtureViews: CardView[] = fixtureCards.map(toCardView)

export function findFixture(cardId: string): CardView | undefined {
  return fixtureViews.find((card) => card.id === cardId)
}

/** What GET /api/wall returns: public, ready cards only. */
export const fixtureWall: WallPage = {
  items: fixtureViews.filter((card) => card.isPublic && card.status === 'ready'),
  nextCursor: null,
}
