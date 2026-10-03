/**
 * The Kurious top bar: wordmark (home = Ask) on the left; the Wonder Wall and a
 * small grown-up menu (sign in / out, My questions, About) on the right.
 * Keeps the scaffold's test hooks: app-navigation, nav-sign-in-button,
 * nav-user-name, nav-user-email.
 */

import { Link, NavLink } from 'react-router-dom'
import { signOut, useAuthProfileReady } from 'deepspace'
import { BookHeart, Info, LogOut } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { StarDoodle } from './doodles'
import { useSignIn } from './SignIn'
import { Wordmark } from './Wordmark'

export function TopBar() {
  return (
    <header data-testid="app-navigation" className="relative z-30">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-2 px-4 md:h-[72px] md:px-6">
        <Link to="/" aria-label="Kurious: ask a new question" className="-ml-1 rounded-xl px-1 py-1">
          <Wordmark className="text-[28px] md:text-[32px]" />
        </Link>
        <div className="flex-1" />
        <NavLink
          to="/wall"
          className={({ isActive }) =>
            cn(
              'cut inline-flex min-h-11 items-center gap-1.5 rounded-pill border-2 px-3.5 font-display text-[16px] font-medium text-ink md:px-4 md:text-[17px]',
              isActive ? 'tint-star border-star-deep/40' : 'tone-cream border-ink/12',
            )
          }
        >
          <StarDoodle className="h-5 w-5" />
          Wonder Wall
        </NavLink>
        <GrownUpMenu />
      </div>
    </header>
  )
}

function GrownUpMenu() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({ requireUser: true })
  const { openSignIn } = useSignIn()

  if (!isLoaded) return <div className="h-11 w-11" aria-hidden="true" />

  if (isSignedIn && (userLoading || !user)) {
    return <div className="h-11 w-11 animate-pulse rounded-full bg-paper-3" aria-label="Loading account" />
  }

  if (!isSignedIn || !user) {
    return (
      <button
        type="button"
        data-testid="nav-sign-in-button"
        onClick={openSignIn}
        className="min-h-11 rounded-pill px-3 font-display text-[15px] font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline md:text-[16px]"
      >
        Sign in
      </button>
    )
  }

  const initial = (user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Grown-up menu"
            className="flex min-h-11 items-center gap-2 rounded-pill p-1 text-ink hover:bg-paper-2 md:pr-3"
          >
            <Avatar className="h-9 w-9 ring-2 ring-ink/10">
              <AvatarImage src={user.imageUrl ?? undefined} referrerPolicy="no-referrer" />
              <AvatarFallback className="bg-sky/30 font-display text-[15px] text-ink">{initial}</AvatarFallback>
            </Avatar>
            <span
              data-testid="nav-user-name"
              className="hidden max-w-[120px] truncate font-display text-[15px] font-medium md:inline"
            >
              {user.name || user.email}
            </span>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-60 rounded-2xl border-2 border-ink/10 bg-cream p-1.5">
        <DropdownMenuLabel className="px-2.5 py-2">
          <div className="truncate font-display text-[15px] font-semibold text-ink">{user.name || 'Signed in'}</div>
          <div data-testid="nav-user-email" className="truncate text-[13px] font-normal text-ink-soft">
            {user.email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-11 rounded-xl px-2.5 font-display text-[15px]"
          render={<Link to="/me" />}
        >
          <BookHeart aria-hidden />
          My questions
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11 rounded-xl px-2.5 font-display text-[15px]"
          render={<Link to="/about" />}
        >
          <Info aria-hidden />
          About Kurious
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11 rounded-xl px-2.5 font-display text-[15px]" onClick={() => signOut()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
