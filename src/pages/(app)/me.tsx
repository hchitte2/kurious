/**
 * My questions (`/me`): each trail is a row of stepping stones, one
 * thumbnail per stop. Tapping a stone opens that card. Signed-in grown-ups only.
 */

import { Link } from 'react-router-dom'
import { useAuthStatus } from 'deepspace'
import { cn } from '@/lib/utils'
import { primaryButton } from '../../components/kurious/buttons'
import { StarDoodle } from '../../components/kurious/doodles'
import { Kuri } from '../../components/kurious/Kuri'
import { KuriMessage } from '../../components/kurious/KuriMessage'
import { useSignIn } from '../../components/kurious/SignIn'
import { useFixtureMode } from '../../hooks/fixtureMode'
import { type Trail, useMyCards } from '../../hooks/useMyCards'
import { type CardView, isGenerating } from '../../shared/card'

export default function MyQuestionsPage() {
  const fixtures = useFixtureMode()
  const { isSignedIn } = useAuthStatus()
  const { openSignIn } = useSignIn()

  if (!isSignedIn && !fixtures) {
    return (
      <div className="py-16">
        <title>My questions | Kurious</title>
        <KuriMessage
          headingLevel={1}
          title="Grown-ups: sign in to see your trails."
          actions={
            <button type="button" onClick={openSignIn} className={primaryButton}>
              Sign in
            </button>
          }
        >
          Every question you ask, and every “But why?” after it, is saved here.
        </KuriMessage>
      </div>
    )
  }

  return <MyTrails />
}

function MyTrails() {
  const { status, trails } = useMyCards()

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-4 md:px-6">
      <title>My questions | Kurious</title>
      <h1 className="font-display text-[32px] font-semibold leading-tight text-ink md:text-[44px]">My questions</h1>
      <p className="mt-1 text-[16px] text-ink-soft md:text-[17px]">Every trail you’ve explored, one stone per question.</p>

      {status === 'loading' ? (
        <div className="mt-8 space-y-5" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-card border-2 border-ink/10 bg-cream p-5">
              <div className="shimmer-line h-6 w-[60%] rounded-pill" />
              <div className="mt-5 flex gap-6">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="shimmer-line h-16 w-16 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : status === 'error' ? (
        <KuriMessage
          state="sad"
          className="py-12"
          title="Kuri can’t find your trails right now."
          actions={
            <button type="button" onClick={() => window.location.reload()} className={primaryButton}>
              Try again
            </button>
          }
        />
      ) : trails.length === 0 ? (
        <KuriMessage
          className="py-12"
          title="No questions yet."
          actions={
            <Link to="/" className={primaryButton}>
              Ask Kuri
            </Link>
          }
        >
          Ask your first one and it will show up here.
        </KuriMessage>
      ) : (
        <ul className="mt-8 space-y-4">
          {trails.map((trail) => (
            <TrailRow key={trail.rootId} trail={trail} />
          ))}
        </ul>
      )}
    </div>
  )
}

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

function when(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return dayFormat.format(date)
}

function TrailRow({ trail }: { trail: Trail }) {
  const root = trail.stops[0]
  const count = trail.stops.length
  const meta = `${count === 1 ? '1 question' : `${count} questions`}, ${when(trail.lastAt)}`

  if (count === 1) {
    return (
      <li>
        <Link
          to={`/c/${root.id}`}
          className="cut cut-lift tone-cream group flex items-center gap-4 rounded-card border-2 border-ink/10 p-3 md:p-4"
        >
          <Stone card={root} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[19px] font-semibold leading-snug text-ink md:text-[21px]">{root.question}</h2>
            <p className="mt-0.5 text-[15px] text-ink-soft">{meta}</p>
          </div>
        </Link>
      </li>
    )
  }

  return (
    <li className="rounded-card border-2 border-ink/10 bg-cream p-4 shadow-[0_4px_0_rgba(30,42,68,0.08)] md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-[20px] font-semibold leading-snug text-ink md:text-[22px]">{root.question}</h2>
        <p className="text-[15px] text-ink-soft">{meta}</p>
      </div>
      <ol className="scroll-strip -mx-4 mt-4 flex items-start overflow-x-auto px-4 pb-1 md:-mx-5 md:px-5">
        {trail.stops.map((stop, i) => (
          <li key={stop.id} className="relative flex w-[104px] shrink-0 flex-col items-center text-center md:w-[120px]">
            {i < count - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[calc(50%+38px)] top-[36px] w-[calc(100%-76px)] border-t-[3px] border-dotted border-ink/25"
              />
            )}
            <Link to={`/c/${stop.id}`} className="group flex flex-col items-center rounded-2xl">
              <Stone card={stop} />
              <span className="mt-2 line-clamp-2 px-1 text-[13px] leading-snug text-ink-soft group-hover:text-ink md:text-[14px]">
                {stop.question}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </li>
  )
}

function Stone({ card }: { card: CardView }) {
  const generating = isGenerating(card.status)
  return (
    <span
      className={cn(
        'relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-[3px] bg-paper-2 transition-transform group-hover:-translate-y-0.5',
        card.status === 'error' ? 'border-berry/50' : generating ? 'border-star-deep' : 'border-cream ring-2 ring-ink/10',
      )}
    >
      {card.imageUrl ? (
        <img src={card.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : card.status === 'error' || card.status === 'declined' ? (
        <Kuri state="sad" size={52} />
      ) : generating ? (
        <Kuri state="painting" size={52} />
      ) : (
        <StarDoodle className="h-8 w-8" />
      )}
    </span>
  )
}
