/**
 * Small hand-drawn doodles that lucide doesn't have: the wordmark star, the
 * age-band sprouts, a volcano, and the "?" bubble on "But why?" chips.
 */

import { cn } from '@/lib/utils'

export function StarDoodle({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        d="M12 2.6 L14.7 8.4 L21 9.1 L16.3 13.4 L17.6 19.7 L12 16.5 L6.4 19.7 L7.7 13.4 L3 9.1 L9.3 8.4 Z"
        fill="var(--color-star)"
        stroke="var(--color-star-deep)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** A growing plant: 1, 2 or 3 leaves for the three age bands. */
export function SproutDoodle({ leaves, className }: { leaves: 1 | 2 | 3; className?: string }) {
  const stemTop = leaves === 1 ? 13 : leaves === 2 ? 9 : 5
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 21 H19" stroke="var(--color-ink)" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      <path d={`M12 21 V${stemTop}`} stroke="var(--color-leaf-deep)" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17 C8 17 6 14.5 6 12.5 C9 12.5 11.5 14 12 17 Z" fill="var(--color-leaf)" />
      {leaves >= 2 && <path d="M12 13 C16 13 18 10.5 18 8.5 C15 8.5 12.5 10 12 13 Z" fill="var(--color-leaf)" />}
      {leaves >= 3 && <path d="M12 8.5 C9 8.5 7.5 6 7.5 3.5 C10.5 4 12 6 12 8.5 Z" fill="var(--color-leaf)" />}
    </svg>
  )
}

export function VolcanoDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20 L9 9 H15 L21 20 Z" />
      <path d="M9 9 Q10.5 11.5 12 10 Q13.5 11.5 15 9" />
      <path d="M12 6 V3 M8.5 6.5 L7 4.5 M15.5 6.5 L17 4.5" />
    </svg>
  )
}

/** A round speech-bubble with a "?" for the "But why?" chips. */
export function WhyBubble({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cn('shrink-0', className)} aria-hidden="true">
      <path
        d="M14 3 C20.6 3 25 7.2 25 12.6 C25 18 20.6 22 14 22 C12.6 22 11.4 21.8 10.2 21.5 L5 24.5 L6.4 19.4 C4.2 17.6 3 15.3 3 12.6 C3 7.2 7.4 3 14 3 Z"
        fill="currentColor"
      />
      <path
        d="M11.2 10.3 C11.4 8.7 12.6 7.8 14.1 7.8 C15.8 7.8 17 8.9 17 10.3 C17 12.4 14.3 12.5 14.3 14.6"
        fill="none"
        stroke="var(--color-cream)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="14.3" cy="17.6" r="1.4" fill="var(--color-cream)" />
    </svg>
  )
}
