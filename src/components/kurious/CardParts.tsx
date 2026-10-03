/**
 * The pieces of a card: trail breadcrumb, stage row, picture (with the brush
 * reveal), play button, paragraph (shimmer, then sentence-by-sentence), the
 * "But why?" chips, and the small grown-up badges.
 */

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Info, Leaf, Lightbulb, Mic, Paintbrush, Pause, Play, ShieldCheck } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'
import { AGE_BAND_LABELS, type AgeBand, type CardStage, type TrailStop } from '@/shared/card'
import { SproutDoodle, StarDoodle, WhyBubble } from './doodles'
import { Kuri, type KuriState } from './Kuri'

// ── Trail breadcrumb ────────────────────────────────────────────────────────

export function TrailBreadcrumb({ trail, current }: { trail: TrailStop[]; current: string }) {
  if (trail.length === 0) return null
  const stops = [...trail, { cardId: '', question: current }]
  return (
    <nav aria-label="Your question trail" className="scroll-strip -mx-4 overflow-x-auto px-4">
      <ol className="flex w-max items-start pb-1">
        {stops.map((stop, i) => {
          const isCurrent = i === stops.length - 1
          return (
            <li key={stop.cardId || 'current'} className="relative flex w-[112px] flex-col items-center text-center md:w-[136px]">
              {!isCurrent && (
                <span
                  aria-hidden="true"
                  className="absolute left-[calc(50%+16px)] top-[13px] w-[calc(100%-32px)] border-t-[3px] border-dotted border-ink/25"
                />
              )}
              {isCurrent ? (
                <span className="flex h-7 w-7 items-center justify-center" aria-current="step">
                  <StarDoodle className="h-7 w-7" />
                </span>
              ) : (
                <Link
                  to={`/c/${stop.cardId}`}
                  className="group flex flex-col items-center rounded-xl"
                  aria-label={`Back to: ${stop.question}`}
                >
                  <span className="mt-1 h-5 w-5 rounded-full border-[3px] border-sky-deep bg-[#d9eefc] transition-transform group-hover:scale-110" />
                </Link>
              )}
              <span
                className={cn(
                  'mt-1.5 line-clamp-2 px-1 text-[13px] leading-snug md:text-[14px]',
                  isCurrent ? 'font-display font-semibold text-ink' : 'text-ink-soft',
                )}
              >
                {isCurrent ? 'You are here' : <Link to={`/c/${stop.cardId}`} tabIndex={-1} className="hover:text-ink">{stop.question}</Link>}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ── Stage row ───────────────────────────────────────────────────────────────

const STAGES: { id: Exclude<CardStage, 'done'>; label: string; Icon: typeof Lightbulb; kuri: KuriState; say: string }[] = [
  { id: 'thinking', label: 'Thinking', Icon: Lightbulb, kuri: 'thinking', say: 'Kuri is thinking it through…' },
  { id: 'checking', label: 'Checking', Icon: ShieldCheck, kuri: 'thinking', say: 'Kuri is double-checking…' },
  { id: 'painting', label: 'Painting', Icon: Paintbrush, kuri: 'painting', say: 'Kuri is painting your picture…' },
  { id: 'recording', label: 'Recording', Icon: Mic, kuri: 'recording', say: 'Kuri is getting ready to read it to you…' },
]

export function StageRow({ stage }: { stage: CardStage }) {
  const currentIndex = stage === 'done' ? STAGES.length : STAGES.findIndex((s) => s.id === stage)
  const current = STAGES[currentIndex]
  return (
    <div className="flex items-center gap-3 rounded-card border-2 border-ink/10 bg-paper-2 p-3 md:gap-4 md:p-4">
      <Kuri state={current?.kuri ?? 'idle'} size={64} className="md:h-[76px] md:w-[76px]" />
      <div className="min-w-0 flex-1">
        <p aria-live="polite" className="font-display text-[16px] font-medium text-ink md:text-[18px]">
          {current?.say ?? 'All done!'}
        </p>
        <ol className="mt-2 grid grid-cols-4 gap-1">
          {STAGES.map(({ id, label, Icon }, i) => {
            const done = i < currentIndex
            const active = i === currentIndex
            return (
              <li key={id} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors md:h-10 md:w-10',
                    done && 'border-leaf-deep bg-leaf text-ink',
                    active && 'border-star-deep bg-star text-ink',
                    !done && !active && 'border-ink/15 bg-cream text-ink/35',
                  )}
                >
                  {done ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden /> : <Icon className={cn('h-[18px] w-[18px]', active && 'bounce-dot')} aria-hidden />}
                </span>
                <span
                  className={cn(
                    'text-[12px] leading-tight md:text-[13px]',
                    active ? 'font-display font-semibold text-ink' : done ? 'text-ink-soft' : 'text-ink/45',
                  )}
                >
                  {label}
                  <span className="sr-only">{done ? ' (done)' : active ? ' (now)' : ''}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

// ── Picture ─────────────────────────────────────────────────────────────────

export function CardPicture({
  imageUrl,
  question,
  painting,
  children,
}: {
  imageUrl: string | null
  question: string
  /** Still being painted: show the moving brush strokes. */
  painting: boolean
  /** Overlays (the play button). */
  children?: ReactNode
}) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const loaded = imageUrl !== null && loadedUrl === imageUrl
  return (
    <div className="relative">
      <div className="paper-slot relative aspect-[4/3] w-full overflow-hidden rounded-card border-2 border-ink/10">
        {!loaded && painting && <PaintStrokes />}
        {!loaded && !painting && !imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <StarDoodle className="h-16 w-16 opacity-60" />
          </div>
        )}
        {imageUrl && (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={`A picture for “${question}”`}
            onLoad={() => setLoadedUrl(imageUrl)}
            className={cn('absolute inset-0 h-full w-full object-cover', loaded ? 'brush-reveal' : 'opacity-0')}
          />
        )}
      </div>
      {children}
    </div>
  )
}

/** Brush strokes that paint themselves in, over and over, while the picture is on its way. */
function PaintStrokes() {
  const strokes = [
    { d: 'M40 70 C110 40 190 95 270 60 S350 40 370 55', color: 'var(--color-sky)', width: 46, delay: '0s' },
    { d: 'M300 150 m-34 0 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0', color: 'var(--color-star)', width: 26, delay: '0.5s' },
    { d: 'M30 215 C100 180 170 240 240 205 S340 190 375 215', color: 'var(--color-leaf)', width: 50, delay: '1s' },
    { d: 'M60 262 C140 248 220 280 330 258', color: 'var(--color-sun)', width: 22, delay: '1.4s' },
  ]
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {strokes.map((s) => (
        <path
          key={s.d}
          className="paint-path"
          d={s.d}
          pathLength={1}
          fill="none"
          stroke={s.color}
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animationDelay: s.delay }}
        />
      ))}
    </svg>
  )
}

// ── Play button ─────────────────────────────────────────────────────────────

export function PlayButton({ audioUrl, waiting }: { audioUrl: string | null; waiting: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setPlaying(false)
  }, [audioUrl])

  if (!audioUrl && !waiting) return null

  const base =
    'absolute -bottom-6 right-4 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-cream md:right-6'

  if (!audioUrl) {
    return (
      <button type="button" disabled aria-label="Getting my voice ready" className={cn(base, 'cut tone-paper text-ink/40')}>
        <Mic className="h-7 w-7" aria-hidden />
      </button>
    )
  }

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.currentTime = audio.ended ? 0 : audio.currentTime
      void audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Read it to me'}
        aria-pressed={playing}
        className={cn(base, 'cut tone-sun pop-in text-ink')}
      >
        {playing && (
          <>
            <span aria-hidden="true" className="sound-ring absolute inset-0 rounded-full border-[3px] border-sun" />
            <span aria-hidden="true" className="sound-ring absolute inset-0 rounded-full border-[3px] border-sun [animation-delay:0.7s]" />
          </>
        )}
        {playing ? <Pause className="h-7 w-7 fill-ink" aria-hidden /> : <Play className="ml-1 h-7 w-7 fill-ink" aria-hidden />}
      </button>
    </>
  )
}

// ── Paragraph ───────────────────────────────────────────────────────────────

export function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+(?:[.!?]+["”’')\]]*)\s*|[^.!?]+$/g)
  return parts && parts.length > 0 ? parts : [text]
}

/** How long the sentence reveal takes, so the chips can pop in after it. */
export function revealMs(paragraph: string | null): number {
  return paragraph ? splitSentences(paragraph).length * 120 + 300 : 0
}

export function CardParagraph({ paragraph, waiting }: { paragraph: string | null; waiting: boolean }) {
  const sentences = useMemo(() => (paragraph ? splitSentences(paragraph) : []), [paragraph])
  const className = 'max-w-[55ch] font-read text-[22px] leading-[1.6] text-ink md:text-[26px]'

  if (!paragraph) {
    if (!waiting) return null
    return (
      <div className="flex flex-col gap-3.5 py-2" aria-hidden="true">
        {['94%', '100%', '88%', '96%', '58%'].map((w) => (
          <span key={w} className="shimmer-line h-[18px] rounded-pill md:h-[20px]" style={{ width: w }} />
        ))}
      </div>
    )
  }

  return (
    <p key={paragraph} className={className}>
      {sentences.map((sentence, i) => (
        <span key={i} className="rise-in inline" style={{ animationDelay: `${i * 120}ms` }}>
          {sentence}
        </span>
      ))}
    </p>
  )
}

// ── But why? ────────────────────────────────────────────────────────────────

const CHIP_TINTS = ['tint-sky', 'tint-berry', 'tint-star'] as const
const CHIP_ICON = ['text-sky-deep', 'text-berry', 'text-star-deep'] as const

export function FollowUpChips({
  followUps,
  onPick,
  pendingQuestion,
  delayMs = 0,
}: {
  followUps: string[]
  onPick: (question: string) => void
  pendingQuestion: string | null
  delayMs?: number
}) {
  if (followUps.length === 0) return null
  return (
    <section aria-labelledby="but-why" className="mt-8">
      <h2 id="but-why" className="font-display text-[24px] font-semibold text-ink md:text-[28px]">
        But why?
      </h2>
      <ul className="mt-3 flex flex-col gap-4 md:flex-row md:flex-wrap">
        {followUps.map((question, i) => {
          const isPending = pendingQuestion === question
          return (
            <li key={question} className="pop-in" style={{ animationDelay: `${delayMs + i * 90}ms` }}>
              <button
                type="button"
                disabled={pendingQuestion !== null}
                onClick={() => onPick(question)}
                className={cn(
                  'cut flex min-h-16 w-full items-center gap-3 rounded-[22px] py-3 pl-3 pr-5 text-left font-display text-[18px] font-medium leading-snug text-ink disabled:opacity-70 md:w-auto md:text-[20px]',
                  CHIP_TINTS[i % CHIP_TINTS.length],
                  isPending && 'opacity-100 disabled:opacity-100',
                )}
              >
                <WhyBubble className={cn('h-8 w-8', CHIP_ICON[i % CHIP_ICON.length])} />
                <span className="flex-1">{question}</span>
                {isPending && <ThinkingDots />}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label="Kuri is on it">
      {[0, 1, 2].map((i) => (
        <span key={i} className="bounce-dot h-2 w-2 rounded-full bg-ink" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  )
}

// ── Badges ──────────────────────────────────────────────────────────────────

export function CheckedBadge() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border-2 border-leaf/40 bg-[#d6efdf] px-3 font-display text-[15px] font-medium text-ink"
          >
            <Leaf className="h-4 w-4 text-leaf-deep" aria-hidden />
            Checked
            <Info className="h-3.5 w-3.5 text-ink-soft" aria-label="What does Checked mean?" />
          </button>
        }
      />
      <PopoverContent className="max-w-[280px] rounded-2xl border-2 border-ink/10 bg-cream p-4 text-[15px] leading-snug text-ink">
        <p className="font-display font-semibold">For grown-ups</p>
        <p className="mt-1 text-ink-soft">
          A second AI from a different company checked this answer for common mix-ups before it was shown.
        </p>
      </PopoverContent>
    </Popover>
  )
}

const BAND_LEAVES: Record<AgeBand, 1 | 2 | 3> = { little: 1, kid: 2, big: 3 }

export function AgeChip({ ageBand, className }: { ageBand: AgeBand; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill bg-paper-2 px-2.5 py-1 font-display text-[13px] font-medium text-ink-soft md:text-[14px]',
        className,
      )}
    >
      <SproutDoodle leaves={BAND_LEAVES[ageBand]} className="h-4 w-4" />
      Ages {AGE_BAND_LABELS[ageBand].ages}
    </span>
  )
}
