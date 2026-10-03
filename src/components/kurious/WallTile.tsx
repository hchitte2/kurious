import { Link } from 'react-router-dom'
import type { CardView } from '@/shared/card'
import { cn } from '@/lib/utils'
import { AgeChip } from './CardParts'
import { StarDoodle } from './doodles'

/** One card on the Wonder Wall (and the strip on Ask). Lifts on hover, presses down on tap. */
export function WallTile({ card, compact = false, className }: { card: CardView; compact?: boolean; className?: string }) {
  return (
    <Link
      to={`/c/${card.id}`}
      className={cn(
        'cut cut-lift tone-cream group block rounded-card border-2 border-ink/10 p-2',
        compact ? 'w-[176px] shrink-0 snap-start md:w-[200px]' : 'p-2.5',
        className,
      )}
    >
      <div className="paper-slot relative aspect-[4/3] overflow-hidden rounded-[18px]">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <StarDoodle className="h-10 w-10 opacity-60" />
          </div>
        )}
      </div>
      <div className={cn('px-1.5', compact ? 'pb-1 pt-2' : 'pb-1.5 pt-3')}>
        <p
          className={cn(
            'font-display font-semibold leading-snug text-ink',
            compact ? 'line-clamp-2 text-[16px]' : 'text-[18px] md:text-[19px]',
          )}
        >
          {card.question}
        </p>
        {!compact && <AgeChip ageBand={card.ageBand} className="mt-2" />}
      </div>
    </Link>
  )
}

export function WallTileSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-card border-2 border-ink/10 bg-cream p-2',
        compact ? 'w-[176px] shrink-0 md:w-[200px]' : 'mb-5 break-inside-avoid p-2.5',
      )}
    >
      <div className="shimmer-line aspect-[4/3] rounded-[18px]" />
      <div className="space-y-2 px-1.5 pb-1 pt-3">
        <div className="shimmer-line h-4 w-[90%] rounded-pill" />
        <div className="shimmer-line h-4 w-[60%] rounded-pill" />
      </div>
    </div>
  )
}
