/**
 * Wonder Wall (`/wall`): what kids are wondering. Public, no sign-in.
 */

import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { primaryButton, secondaryButton } from '../../components/kurious/buttons'
import { ThinkingDots } from '../../components/kurious/CardParts'
import { Kuri } from '../../components/kurious/Kuri'
import { KuriMessage } from '../../components/kurious/KuriMessage'
import { NightBand } from '../../components/kurious/NightBand'
import { WallTile, WallTileSkeleton } from '../../components/kurious/WallTile'
import { useWall } from '../../hooks/useWall'

export default function WallPage() {
  const wall = useWall(12)
  const initialLoading = wall.isLoadingInitial && wall.items.length === 0

  return (
    <div className="pb-24">
      <title>Wonder Wall | Kurious</title>

      <NightBand className="mx-auto max-w-[1100px] md:mx-6 md:rounded-[30px] min-[1148px]:mx-auto">
        <div className="flex items-end justify-between gap-4 px-5 pb-7 pt-8 md:px-10 md:pb-9 md:pt-11">
          <div>
            <h1 className="font-display text-[34px] font-semibold leading-tight text-cream md:text-[46px]">Wonder Wall</h1>
            <p className="mt-1 text-[17px] text-cream/80 md:text-[19px]">What kids are wondering</p>
          </div>
          <Kuri size={84} className="-mb-2 md:h-[112px] md:w-[112px]" />
        </div>
      </NightBand>

      <div className="mx-auto mt-8 max-w-[1100px] px-4 md:px-6">
        {wall.status === 'error' && wall.items.length === 0 ? (
          <KuriMessage
            state="sad"
            className="py-12"
            title="The Wonder Wall is hiding."
            actions={
              <button type="button" onClick={wall.retry} className={primaryButton}>
                Try again
              </button>
            }
          >
            Kuri couldn’t reach it just now.
          </KuriMessage>
        ) : initialLoading ? (
          <div className="columns-2 gap-5 lg:columns-3" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <WallTileSkeleton key={i} />
            ))}
          </div>
        ) : wall.items.length === 0 ? (
          <KuriMessage
            className="py-12"
            title="No wonders yet. Be the first!"
            actions={
              <Link to="/" className={primaryButton}>
                Ask Kuri
              </Link>
            }
          />
        ) : (
          <>
            <ul className="columns-2 gap-4 md:gap-5 lg:columns-3">
              {wall.items.map((card, i) => (
                <li key={card.id} className="pop-in mb-4 break-inside-avoid md:mb-5" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <WallTile card={card} />
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-center gap-3">
              {wall.error && (
                <p role="alert" className="flex items-center gap-2 text-[16px] text-ink-soft">
                  <Kuri state="sad" size={36} />
                  Kuri couldn’t fetch more just now.
                </p>
              )}
              {wall.hasMore && (
                <button
                  type="button"
                  onClick={wall.error ? wall.retry : wall.loadMore}
                  disabled={wall.isLoadingMore}
                  className={cn(secondaryButton, 'min-w-[220px]')}
                >
                  {wall.isLoadingMore ? (
                    <>
                      Finding more <ThinkingDots />
                    </>
                  ) : wall.error ? (
                    'Try again'
                  ) : (
                    'Load more wonders'
                  )}
                </button>
              )}
              {!wall.hasMore && !wall.error && (
                <p className="text-[16px] text-ink-soft">
                  That’s every wonder so far.{' '}
                  <Link to="/" className="font-display font-medium text-ink underline decoration-sun underline-offset-4">
                    Ask a new one
                  </Link>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
