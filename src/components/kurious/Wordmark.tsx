import { cn } from '@/lib/utils'
import { StarDoodle } from './doodles'

/** "Kurious" in Fredoka, with a small star standing in for the dot over the i. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-baseline font-display font-semibold leading-none tracking-tight text-ink', className)}
    >
      <span className="sr-only">Kurious</span>
      <span aria-hidden="true">Kur</span>
      <span aria-hidden="true" className="relative inline-block">
        {'ı'}
        <StarDoodle className="absolute left-1/2 top-[0.12em] h-[0.42em] w-[0.42em] -translate-x-1/2 rotate-[-8deg]" />
      </span>
      <span aria-hidden="true">ous</span>
    </span>
  )
}
