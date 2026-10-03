import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Fixed positions (no randomness), so the band renders the same everywhere. */
const STARS = [
  { x: 3, y: 10, s: 7, d: 0 },
  { x: 17, y: 8, s: 5, d: 1.1 },
  { x: 31, y: 13, s: 8, d: 0.4 },
  { x: 45, y: 7, s: 6, d: 1.7 },
  { x: 53, y: 34, s: 9, d: 0.8 },
  { x: 60, y: 76, s: 6, d: 2.1 },
  { x: 66, y: 18, s: 7, d: 0.2 },
  { x: 72, y: 88, s: 5, d: 1.4 },
  { x: 86, y: 6, s: 8, d: 0.6 },
  { x: 97, y: 30, s: 6, d: 1.9 },
  { x: 97, y: 82, s: 7, d: 1.2 },
  { x: 63, y: 52, s: 5, d: 2.4 },
]

/** The Wonder Wall's night-sky header band, with a few twinkling stars. */
export function NightBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-night text-cream', className)}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {STARS.map((star, i) => (
          <svg key={i} x={`${star.x}%`} y={`${star.y}%`} width={star.s * 2} height={star.s * 2} viewBox="0 0 24 24" overflow="visible">
            <path
              className="twinkle"
              style={{ animationDelay: `${star.d}s` }}
              d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z"
              fill={i % 3 === 0 ? 'var(--color-star)' : '#FFF8EC'}
            />
          </svg>
        ))}
      </svg>
      <div className="relative">{children}</div>
    </div>
  )
}
