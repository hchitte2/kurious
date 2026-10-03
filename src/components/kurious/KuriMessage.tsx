/** Kuri plus a short message and next steps: empty, error, declined, not-found states. */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Kuri, type KuriState } from './Kuri'

export function KuriMessage({
  title,
  children,
  actions,
  state = 'idle',
  size = 120,
  className,
  headingLevel = 2,
}: {
  title: string
  children?: ReactNode
  actions?: ReactNode
  state?: KuriState
  size?: number
  className?: string
  headingLevel?: 1 | 2
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div className={cn('flex flex-col items-center px-4 text-center', className)} role={state === 'sad' ? 'status' : undefined}>
      <Kuri state={state} size={size} />
      <Heading className="mt-4 max-w-[22ch] font-display text-[24px] font-semibold leading-snug text-ink md:text-[28px]">
        {title}
      </Heading>
      {children && <div className="mt-2 max-w-[40ch] text-[16px] text-ink-soft md:text-[17px]">{children}</div>}
      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  )
}
