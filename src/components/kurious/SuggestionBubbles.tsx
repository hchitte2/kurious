/** Colorful question bubbles. Tapping one asks it straight away. */

import type { ComponentType } from 'react'
import { Apple, Bone, CloudRain, Moon, Rainbow, Snowflake, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VolcanoDoodle } from './doodles'

export interface Suggestion {
  question: string
  Icon: ComponentType<{ className?: string }>
}

export const SUGGESTIONS: Suggestion[] = [
  { question: 'Why does the moon change shape?', Icon: Moon },
  { question: 'Why does ice float?', Icon: Snowflake },
  { question: 'Why do apples turn brown?', Icon: Apple },
  { question: 'How do rainbows happen?', Icon: Rainbow },
  { question: 'Why did the dinosaurs disappear?', Icon: Bone },
  { question: 'Why do stars twinkle?', Icon: Star },
  { question: 'Where does rain come from?', Icon: CloudRain },
  { question: 'Why do volcanoes erupt?', Icon: VolcanoDoodle },
]

const TINTS = ['tint-sky', 'tint-berry', 'tint-star', 'tint-leaf', 'tint-sun'] as const
const ICON_COLORS = ['text-sky-deep', 'text-berry-deep', 'text-star-deep', 'text-leaf-deep', 'text-sun-deep'] as const

export function SuggestionBubbles({
  onPick,
  items = SUGGESTIONS,
  disabled = false,
  className,
}: {
  onPick: (question: string) => void
  items?: Suggestion[]
  disabled?: boolean
  className?: string
}) {
  return (
    <ul className={cn('flex flex-wrap justify-center gap-x-3 gap-y-4', className)}>
      {items.map(({ question, Icon }, i) => (
        <li key={question}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(question)}
            className={cn(
              'cut flex min-h-12 items-center gap-2 rounded-pill py-2 pl-2.5 pr-4 text-left font-display text-[17px] font-medium leading-tight text-ink disabled:opacity-60 md:text-[18px]',
              TINTS[i % TINTS.length],
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream">
              <Icon className={cn('h-[18px] w-[18px]', ICON_COLORS[i % ICON_COLORS.length])} />
            </span>
            {question}
          </button>
        </li>
      ))}
    </ul>
  )
}
