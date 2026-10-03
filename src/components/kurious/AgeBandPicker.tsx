/** Three-option age control: native radios, so arrow keys work for free. */

import { useId } from 'react'
import { AGE_BAND_LABELS, AGE_BANDS, type AgeBand } from '@/shared/card'
import { cn } from '@/lib/utils'
import { SproutDoodle } from './doodles'

const LEAVES: Record<AgeBand, 1 | 2 | 3> = { little: 1, kid: 2, big: 3 }

export function AgeBandPicker({
  value,
  onChange,
  className,
}: {
  value: AgeBand
  onChange: (band: AgeBand) => void
  className?: string
}) {
  const name = useId()
  return (
    <fieldset className={cn('flex flex-col items-center gap-2', className)}>
      <legend className="mb-2 w-full text-center text-[15px] text-ink-soft md:text-[16px]">Kuri answers for ages</legend>
      <div className="grid w-full max-w-[360px] grid-cols-3 gap-1 rounded-pill border-2 border-ink/10 bg-paper-2 p-1">
        {AGE_BANDS.map((band) => {
          const checked = band === value
          const { name: bandName, ages } = AGE_BAND_LABELS[band]
          return (
            <label
              key={band}
              className={cn(
                'relative flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-pill font-display text-[17px] font-medium transition-colors',
                checked ? 'bg-cream text-ink shadow-[0_3px_0_rgba(30,42,68,0.14)]' : 'text-ink-soft hover:text-ink',
              )}
            >
              <input
                type="radio"
                name={name}
                value={band}
                checked={checked}
                onChange={() => onChange(band)}
                className="sr-only"
                aria-label={`${bandName}, ages ${ages}`}
              />
              <SproutDoodle leaves={LEAVES[band]} className="h-5 w-5" />
              {ages}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
