import { Link } from 'react-router-dom'
import { Wordmark } from './Wordmark'

/** Top bar for the static pages (about, 404), which mount no auth providers. */
export function StaticHeader() {
  return (
    <header className="relative z-30">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-2 px-4 md:h-[72px] md:px-6">
        <Link to="/" aria-label="Kurious: ask a question" className="-ml-1 rounded-xl px-1 py-1">
          <Wordmark className="text-[28px] md:text-[32px]" />
        </Link>
        <div className="flex-1" />
        <Link
          to="/wall"
          className="cut tone-cream inline-flex min-h-11 items-center rounded-pill border-2 border-ink/12 px-4 font-display text-[16px] font-medium text-ink md:text-[17px]"
        >
          Wonder Wall
        </Link>
      </div>
    </header>
  )
}
