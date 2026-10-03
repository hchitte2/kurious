/**
 * Ask (`/`): the one thing to do here is ask Kuri a question.
 */

import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStatus } from 'deepspace'
import { cn } from '@/lib/utils'
import { AgeBandPicker } from '../../components/kurious/AgeBandPicker'
import { primaryButton, smallButton } from '../../components/kurious/buttons'
import { ThinkingDots } from '../../components/kurious/CardParts'
import { StarDoodle } from '../../components/kurious/doodles'
import { Kuri } from '../../components/kurious/Kuri'
import { SignInSheet } from '../../components/kurious/SignIn'
import { SuggestionBubbles } from '../../components/kurious/SuggestionBubbles'
import { WallTile, WallTileSkeleton } from '../../components/kurious/WallTile'
import { useAgeBand } from '../../hooks/useAgeBand'
import { useAsk } from '../../hooks/useAsk'
import { useFixtureMode } from '../../hooks/fixtureMode'
import { useWallPreview } from '../../hooks/useWall'
import { type AskRequest, QUESTION_MAX_CHARS, QUESTION_MIN_CHARS } from '../../shared/card'

const PLACEHOLDERS = [
  'Why is the sky blue?',
  'Why do cats purr?',
  'How do birds fly?',
  'Why do we have to sleep?',
  'Why is the ocean salty?',
  'Where does the sun go at night?',
]

export default function AskPage() {
  const navigate = useNavigate()
  const fixtures = useFixtureMode()
  const { isSignedIn } = useAuthStatus()
  const canAsk = isSignedIn || fixtures

  const [ageBand, setAgeBand] = useAgeBand()
  const [question, setQuestion] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { ask, pending, error, clearError } = useAsk()
  const lastRequest = useRef<AskRequest | null>(null)
  const waitingForSignIn = useRef<AskRequest | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  useEffect(() => {
    if (question) return
    const timer = setInterval(() => setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length), 3200)
    return () => clearInterval(timer)
  }, [question])

  const send = async (req: AskRequest) => {
    lastRequest.current = req
    const result = await ask(req)
    if (result.ok) {
      navigate(`/c/${encodeURIComponent(result.cardId)}`)
    } else if (result.code === 'unauthenticated') {
      clearError()
      waitingForSignIn.current = req
      setSheetOpen(true)
    }
  }

  const submit = (text: string) => {
    const trimmed = text.trim()
    setHint(null)
    clearError()
    if (trimmed.length < QUESTION_MIN_CHARS) {
      setHint('Type a question first, like “Why is grass green?”')
      inputRef.current?.focus()
      return
    }
    const req: AskRequest = { question: trimmed, ageBand }
    if (!canAsk) {
      waitingForSignIn.current = req
      setSheetOpen(true)
      return
    }
    void send(req)
  }

  // A grown-up just signed in from the sheet: ask the waiting question for them.
  useEffect(() => {
    if (!isSignedIn || !waitingForSignIn.current) return
    const req = waitingForSignIn.current
    waitingForSignIn.current = null
    setSheetOpen(false)
    void send(req)
    // Only signing in should trigger this (`send` is recreated each render).
  }, [isSignedIn])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(question)
  }

  const pickSuggestion = (q: string) => {
    setQuestion(q)
    submit(q)
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-20 md:px-6">
      <section className="relative mx-auto mt-24 max-w-[680px] md:mt-28">
        {/* Kuri peeks over the top edge of the card. */}
        <div className="pointer-events-none absolute -top-[78px] left-1/2 z-0 -translate-x-1/2 md:-top-[92px]">
          <Kuri state={pending ? 'thinking' : 'idle'} size={112} className="md:h-[132px] md:w-[132px]" />
        </div>

        <form
          onSubmit={onSubmit}
          className="relative z-10 rounded-[30px] border-2 border-ink/10 bg-cream px-4 pb-6 pt-7 shadow-[0_6px_0_rgba(30,42,68,0.10)] md:px-8 md:pb-8 md:pt-9"
        >
          {/* Wing tips gripping the edge */}
          <span aria-hidden="true" className="absolute -top-[7px] left-1/2 h-4 w-6 -translate-x-[64px] rounded-t-full bg-sun-deep md:-translate-x-[74px]" />
          <span aria-hidden="true" className="absolute -top-[7px] left-1/2 h-4 w-6 translate-x-[40px] rounded-t-full bg-sun-deep md:translate-x-[50px]" />

          <h1 className="text-balance text-center font-display text-[32px] font-semibold leading-[1.15] text-ink md:text-[44px]">
            What are you wondering about?
          </h1>

          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <input
            ref={inputRef}
            id="question"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value)
              if (hint) setHint(null)
            }}
            placeholder={PLACEHOLDERS[placeholderIndex]}
            maxLength={QUESTION_MAX_CHARS}
            autoComplete="off"
            enterKeyHint="go"
            disabled={pending}
            className="mt-5 h-16 w-full rounded-[20px] border-2 border-ink/15 bg-paper px-5 font-display text-[20px] text-ink outline-none transition-colors placeholder:text-ink/40 focus:border-ink focus-visible:outline-none md:mt-6 md:text-[22px]"
          />

          {(hint || error) && (
            <div role="alert" className="mt-3 flex items-start gap-3 rounded-2xl bg-paper-2 p-3 text-left">
              <Kuri state="sad" size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[16px] font-medium leading-snug text-ink md:text-[17px]">
                  {hint ?? error?.copy}
                </p>
                {error?.canRetry && lastRequest.current && (
                  <button
                    type="button"
                    className={cn(smallButton, 'mt-2')}
                    onClick={() => lastRequest.current && void send(lastRequest.current)}
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          <button type="submit" disabled={pending} className={cn(primaryButton, 'mt-4 w-full')}>
            {pending ? (
              <>
                Kuri is on it <ThinkingDots />
              </>
            ) : (
              'Ask Kuri'
            )}
          </button>

          <AgeBandPicker value={ageBand} onChange={setAgeBand} className="mt-6" />
        </form>
      </section>

      <section aria-labelledby="try-one" className="mx-auto mt-12 max-w-[860px]">
        <h2 id="try-one" className="text-center font-display text-[20px] font-semibold text-ink md:text-[22px]">
          Or tap a wonder
        </h2>
        <SuggestionBubbles onPick={pickSuggestion} disabled={pending} className="mt-5" />
      </section>

      <WallStrip />

      <p className="mt-14 text-center text-[15px] text-ink-soft">
        <Link to="/about" className="underline decoration-ink/30 underline-offset-4 hover:text-ink">
          For grown-ups: how Kurious works
        </Link>
      </p>

      <SignInSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open && !isSignedIn) waitingForSignIn.current = null
        }}
      />
    </div>
  )
}

function WallStrip() {
  const wall = useWallPreview(6)
  const items = wall.data ?? []

  if (wall.status !== 'loading' && wall.status !== 'error' && items.length === 0) return null

  return (
    <section aria-labelledby="fresh" className="mt-14">
      <div className="flex items-end justify-between gap-3">
        <h2 id="fresh" className="font-display text-[22px] font-semibold text-ink md:text-[26px]">
          Fresh from the Wonder Wall
        </h2>
        <Link
          to="/wall"
          className="hidden shrink-0 rounded-pill px-2 py-2 font-display text-[17px] font-medium text-ink underline decoration-sky decoration-2 underline-offset-4 md:inline-block"
        >
          See them all
        </Link>
      </div>

      {wall.status === 'error' ? (
        <div className="mt-4 flex items-center gap-3 rounded-card bg-paper-2 p-4">
          <Kuri state="sad" size={48} />
          <p className="flex-1 text-[16px] text-ink-soft">The Wonder Wall is hiding right now.</p>
          <button type="button" onClick={wall.reload} className={smallButton}>
            Try again
          </button>
        </div>
      ) : (
        <div className="scroll-strip -mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 pt-1 md:-mx-6 md:px-6">
          {wall.status === 'loading' && items.length === 0
            ? Array.from({ length: 4 }, (_, i) => <WallTileSkeleton key={i} compact />)
            : items.map((card) => <WallTile key={card.id} card={card} compact />)}
          {wall.status === 'ready' && items.length > 0 && (
            <Link
              to="/wall"
              className="cut cut-lift tint-star flex w-[150px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-card p-4 text-center font-display text-[17px] font-semibold leading-snug text-ink md:w-[170px]"
            >
              <StarDoodle className="h-10 w-10" />
              See the whole Wonder Wall
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
