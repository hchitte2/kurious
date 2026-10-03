/**
 * Card (`/c/:id`): one picture, one paragraph read aloud, 2-3 "But why?" chips.
 * Renders every status: generating (progressive reveal), ready, declined,
 * error (and stale, which counts as error), plus loading and not-found.
 */

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuthStatus } from 'deepspace'
import { Link2, RotateCcw } from 'lucide-react'
import { useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { primaryButton, secondaryButton } from '../../../components/kurious/buttons'
import {
  AgeChip,
  CardParagraph,
  CardPicture,
  CheckedBadge,
  FollowUpChips,
  PlayButton,
  revealMs,
  StageRow,
  ThinkingDots,
  TrailBreadcrumb,
} from '../../../components/kurious/CardParts'
import { Kuri } from '../../../components/kurious/Kuri'
import { KuriMessage } from '../../../components/kurious/KuriMessage'
import { SignInSheet, useSignIn } from '../../../components/kurious/SignIn'
import { SUGGESTIONS, SuggestionBubbles } from '../../../components/kurious/SuggestionBubbles'
import { useAgeBand } from '../../../hooks/useAgeBand'
import { useAsk } from '../../../hooks/useAsk'
import { type CardSource, useCard } from '../../../hooks/useCard'
import { useFixtureMode } from '../../../hooks/fixtureMode'
import { useNow } from '../../../hooks/useNow'
import { useRetry } from '../../../hooks/useRetry'
import { type AskRequest, type CardView, cardStage, isGenerating, isStale } from '../../../shared/card'

export default function CardPage() {
  const { id = '' } = useParams()
  const state = useCard(id)

  if (state.status === 'loading') return <CardLoading />

  if (state.status === 'not_found') {
    return (
      <div className="py-16">
        <title>Card not found | Kurious</title>
        <KuriMessage
          headingLevel={1}
          state="sad"
          title="Kuri can’t find that card."
          actions={
            <Link to="/" className={primaryButton}>
              Ask something new
            </Link>
          }
        >
          It might be private, or the link has a typo.
        </KuriMessage>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="py-16">
        <KuriMessage
          headingLevel={1}
          state="sad"
          title="Kuri couldn’t open this card."
          actions={
            <button type="button" onClick={state.retry} className={primaryButton}>
              Try again
            </button>
          }
        >
          Check the internet and give it another go.
        </KuriMessage>
      </div>
    )
  }

  return <CardScreen key={state.card.id} card={state.card} source={state.source} />
}

type Mode = 'generating' | 'ready' | 'declined' | 'error'

const RETRY_COPY = {
  busy: 'Kuri is already working on this one!',
  capped: 'Kuri needs an owl nap. Come back tomorrow to try again.',
  failed: 'That didn’t work either. Try again in a minute?',
} as const

function CardScreen({ card, source }: { card: CardView; source: CardSource }) {
  const navigate = useNavigate()
  const fixtures = useFixtureMode()
  const { isSignedIn } = useAuthStatus()
  const { openSignIn } = useSignIn()
  const toast = useToast()
  const [ageBand] = useAgeBand()

  const generating = isGenerating(card.status)
  const now = useNow(15_000, generating)
  const stale = isStale(card, now)
  const mode: Mode =
    card.status === 'declined' ? 'declined' : card.status === 'error' || stale ? 'error' : generating ? 'generating' : 'ready'
  const stage = cardStage(card)

  const { ask, error: askError } = useAsk()
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const retry = useRetry(card.id)

  const startAsk = async (req: AskRequest) => {
    if (!isSignedIn && !fixtures) {
      setSheetOpen(true)
      return
    }
    setPendingQuestion(req.question)
    const result = await ask(req)
    setPendingQuestion(null)
    if (result.ok) navigate(`/c/${encodeURIComponent(result.cardId)}`)
    else if (result.code === 'unauthenticated') setSheetOpen(true)
  }

  const askFollowUp = (question: string) => void startAsk({ question, ageBand: card.ageBand, parentCardId: card.id })
  const askFresh = (question: string) => void startAsk({ question, ageBand })

  const onRetry = async () => {
    const outcome = await retry.retry()
    if (outcome === 'unauthenticated') openSignIn()
  }

  const share = async () => {
    const url = `${window.location.origin}/c/${encodeURIComponent(card.id)}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied', 'Paste it anywhere to share this card.')
    } catch {
      toast.info('Here’s the link', url)
    }
  }

  const showPicture = mode !== 'declined' && (mode !== 'error' || card.imageUrl !== null)
  const canRetry = source === 'owner' || source === 'fixture'

  return (
    <article className="mx-auto max-w-[1100px] px-4 pb-24 pt-2 md:px-6 md:pt-4">
      <title>{`${card.question} | Kurious`}</title>

      <TrailBreadcrumb trail={card.trail} current={card.question} />

      <h1 className="mt-4 max-w-[26ch] font-display text-[28px] font-semibold leading-[1.15] text-ink md:text-[36px]">
        {card.question}
      </h1>

      {mode === 'generating' && (
        <div className="mt-5 max-w-[640px]">
          <StageRow stage={stage} />
        </div>
      )}

      {mode === 'declined' ? (
        <DeclinedPanel onPick={askFresh} pendingQuestion={pendingQuestion} />
      ) : (
        <div
          className={cn(
            'mt-6 grid gap-10 md:mt-8',
            showPicture ? 'lg:grid-cols-[55fr_45fr] lg:items-start lg:gap-12' : 'max-w-[720px]',
          )}
        >
          {showPicture && (
            <div className="lg:sticky lg:top-6">
              <CardPicture imageUrl={card.imageUrl} question={card.question} painting={mode === 'generating'}>
                {mode !== 'error' && <PlayButton audioUrl={card.audioUrl} waiting={mode === 'generating'} />}
              </CardPicture>
            </div>
          )}

          <div className="min-w-0">
            {mode === 'ready' && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {card.checked && <CheckedBadge />}
                <AgeChip ageBand={card.ageBand} />
              </div>
            )}

            {mode === 'error' && (
              <div role="alert" className="mb-6 flex items-center gap-4 rounded-card border-2 border-ink/10 bg-paper-2 p-4 md:p-5">
                <Kuri state="sad" size={72} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[20px] font-semibold leading-snug text-ink md:text-[22px]">
                    Oops, my paintbrush slipped.
                  </p>
                  {retry.outcome && retry.outcome !== 'ok' && retry.outcome !== 'unauthenticated' && (
                    <p className="mt-1 text-[15px] text-ink-soft">{RETRY_COPY[retry.outcome]}</p>
                  )}
                  {canRetry ? (
                    <button
                      type="button"
                      onClick={() => void onRetry()}
                      disabled={retry.pending}
                      className={cn(primaryButton, 'mt-3 min-h-14 px-6 text-[18px] md:text-[20px]')}
                    >
                      {retry.pending ? (
                        <>
                          Trying again <ThinkingDots />
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-5 w-5" aria-hidden />
                          Retry
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="mt-1 text-[15px] text-ink-soft">Try asking it again from the start.</p>
                  )}
                </div>
              </div>
            )}

            <CardParagraph paragraph={card.paragraph} waiting={mode === 'generating'} />

            <FollowUpChips
              followUps={card.followUps}
              onPick={askFollowUp}
              pendingQuestion={pendingQuestion}
              delayMs={revealMs(card.paragraph)}
            />

            {askError && askError.code !== 'unauthenticated' && (
              <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl bg-paper-2 p-3">
                <Kuri state="sad" size={44} />
                <p className="flex-1 font-display text-[16px] font-medium leading-snug text-ink">{askError.copy}</p>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/" className={secondaryButton}>
                Ask something new
              </Link>
              {card.isPublic && mode === 'ready' && (
                <button
                  type="button"
                  onClick={() => void share()}
                  aria-label="Copy a link to share this card"
                  className={cn(secondaryButton, 'w-14 px-0')}
                >
                  <Link2 className="h-6 w-6" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <SignInSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </article>
  )
}

function DeclinedPanel({ onPick, pendingQuestion }: { onPick: (q: string) => void; pendingQuestion: string | null }) {
  const picks = [SUGGESTIONS[0], SUGGESTIONS[3], SUGGESTIONS[5]]
  return (
    <div className="mx-auto mt-8 max-w-[720px] rounded-[30px] border-2 border-ink/10 bg-cream px-5 py-8 md:px-10">
      <KuriMessage state="sad" size={128} title="That’s a great question to ask a grown-up you trust.">
        Kuri is better at questions about the world, like these:
      </KuriMessage>
      <SuggestionBubbles items={picks} onPick={onPick} disabled={pendingQuestion !== null} className="mt-6" />
      <div className="mt-8 flex justify-center">
        <Link to="/" className={secondaryButton}>
          Ask something new
        </Link>
      </div>
    </div>
  )
}

function CardLoading() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pt-6 md:px-6" aria-busy="true">
      <div className="shimmer-line h-9 w-[70%] max-w-[520px] rounded-pill" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[55fr_45fr] lg:gap-12">
        <div className="paper-slot relative flex aspect-[4/3] items-center justify-center rounded-card border-2 border-ink/10">
          <Kuri state="thinking" size={96} label="Kuri is finding your card" />
        </div>
        <div className="flex flex-col gap-3.5">
          {['94%', '100%', '88%', '70%'].map((w) => (
            <span key={w} className="shimmer-line h-5 rounded-pill" style={{ width: w }} />
          ))}
        </div>
      </div>
    </div>
  )
}
