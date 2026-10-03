/**
 * Kuri, the Kurious owl. One static, hand-drawn SVG (never generated) whose
 * parts are animated purely in CSS (see the `.kuri` rules in styles.css):
 *   idle      - blinks and bobs
 *   thinking  - head tilt, eyes up, thought dots
 *   painting  - waves a paintbrush
 *   recording - sound waves from the beak
 *   sad       - soft, droopy eyes (declined / error / empty)
 * Every animation falls back to stillness under prefers-reduced-motion.
 */

import { cn } from '@/lib/utils'

export type KuriState = 'idle' | 'thinking' | 'painting' | 'recording' | 'sad'

const SUN = 'var(--color-sun)'
const SUN_DEEP = 'var(--color-sun-deep)'
const CREAM = '#FFF8EC'
const INK = 'var(--color-ink)'
const STAR = 'var(--color-star)'
const SKY = 'var(--color-sky)'
const BERRY = 'var(--color-berry)'

export function Kuri({
  state = 'idle',
  size = 96,
  className,
  label,
}: {
  state?: KuriState
  size?: number
  className?: string
  /** Accessible name. Omit when Kuri is decorative (the default). */
  label?: string
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      overflow="visible"
      data-state={state}
      className={cn('kuri shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <g className="kuri-body kuri-part">
        {/* feet */}
        <ellipse cx="49" cy="108" rx="7.5" ry="4" fill={STAR} />
        <ellipse cx="71" cy="108" rx="7.5" ry="4" fill={STAR} />

        {/* ear tufts, behind the body */}
        <g className="kuri-head-back">
          <path d="M31 40 L22 13 L47 28 Z" fill={SUN_DEEP} stroke={SUN_DEEP} strokeWidth="5" strokeLinejoin="round" />
          <path d="M89 40 L98 13 L73 28 Z" fill={SUN_DEEP} stroke={SUN_DEEP} strokeWidth="5" strokeLinejoin="round" />
        </g>

        {/* wings */}
        <path className="kuri-wing-l kuri-part" d="M25 60 C11 72 12 92 28 100 C31 87 31 72 25 60 Z" fill={SUN_DEEP} />
        <path className="kuri-wing-r kuri-part" d="M95 60 C109 72 108 92 92 100 C89 87 89 72 95 60 Z" fill={SUN_DEEP} />

        {/* body */}
        <path d="M60 20 C87 20 98 40 98 66 C98 93 82 109 60 109 C38 109 22 93 22 66 C22 40 33 20 60 20 Z" fill={SUN} />

        {/* belly */}
        <ellipse cx="60" cy="87" rx="24" ry="19" fill={CREAM} />
        <path
          d="M49 82 q3.5 3.5 7 0 M64 82 q3.5 3.5 7 0 M56.5 91 q3.5 3.5 7 0"
          fill="none"
          stroke={SUN_DEEP}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* paintbrush (painting) */}
        <g className="kuri-prop kuri-brush">
          <g className="kuri-brush-arm kuri-part">
            <path d="M97 92 L114 58" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
            <path d="M112.5 61 L115.5 55" stroke="#C9CED8" strokeWidth="6" strokeLinecap="round" />
            <path d="M114 55 C111 49 114 43 118 40 C121 45 120 51 116.5 56 Z" fill={SKY} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          </g>
          <circle cx="109" cy="34" r="2.5" fill={SKY} />
          <circle cx="104" cy="28" r="1.8" fill={STAR} />
        </g>

        <g className="kuri-head kuri-part">
          {/* eye discs */}
          <circle cx="45" cy="51" r="15.5" fill={CREAM} />
          <circle cx="75" cy="51" r="15.5" fill={CREAM} />

          {/* cheeks */}
          <circle cx="33" cy="66" r="4.5" fill={BERRY} opacity="0.35" />
          <circle cx="87" cy="66" r="4.5" fill={BERRY} opacity="0.35" />

          {/* pupils */}
          <g className="kuri-pupils kuri-part">
            <circle cx="46.5" cy="52" r="7.5" fill={INK} />
            <circle cx="73.5" cy="52" r="7.5" fill={INK} />
            <circle cx="49" cy="49" r="2.5" fill="#fff" />
            <circle cx="76" cy="49" r="2.5" fill="#fff" />
          </g>

          {/* eyelids (blink / sad) */}
          <circle className="kuri-lid kuri-lid-l" cx="45" cy="51" r="16.2" fill={SUN} />
          <circle className="kuri-lid kuri-lid-r" cx="75" cy="51" r="16.2" fill={SUN} />

          {/* soft brows (sad) */}
          <g className="kuri-prop kuri-brows">
            <path d="M34 36 L53 32" stroke={SUN_DEEP} strokeWidth="3.2" strokeLinecap="round" />
            <path d="M86 36 L67 32" stroke={SUN_DEEP} strokeWidth="3.2" strokeLinecap="round" />
          </g>

          {/* beak */}
          <path d="M54 62 Q60 59.5 66 62 L60 71.5 Z" fill={STAR} stroke={SUN_DEEP} strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      </g>

      {/* thought dots (thinking) */}
      <g className="kuri-prop kuri-think">
        <circle cx="100" cy="24" r="3" fill={SKY} className="kuri-part" />
        <circle cx="108" cy="15" r="4" fill={SKY} className="kuri-part" />
        <circle cx="118" cy="5" r="5" fill={SKY} className="kuri-part" />
      </g>

      {/* sound waves (recording) */}
      <g className="kuri-prop kuri-waves" fill="none" strokeLinecap="round">
        <path d="M102 56 q5 8 0 16" stroke={SKY} strokeWidth="3.5" className="kuri-part" />
        <path d="M108 50 q9 14 0 28" stroke={BERRY} strokeWidth="3.5" className="kuri-part" />
        <path d="M114 44 q12 20 0 40" stroke={STAR} strokeWidth="3.5" className="kuri-part" />
      </g>
    </svg>
  )
}
