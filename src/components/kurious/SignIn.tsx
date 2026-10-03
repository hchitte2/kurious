/**
 * One place that opens the SDK's sign-in overlay (dressed as Kurious), plus
 * the friendly "Grown-ups: sign in" sheet kids see when they try to ask.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AuthOverlay } from 'deepspace'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Kuri } from './Kuri'
import { primaryButton } from './buttons'

interface SignInContextValue {
  openSignIn: () => void
}

const SignInContext = createContext<SignInContextValue | null>(null)

export function SignInProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openSignIn = useCallback(() => setOpen(true), [])
  const value = useMemo(() => ({ openSignIn }), [openSignIn])
  return (
    <SignInContext.Provider value={value}>
      {children}
      {open && (
        <AuthOverlay
          onClose={() => setOpen(false)}
          title="Grown-ups, sign in"
          description="So Kuri can answer questions and keep your trails."
          logo={<Kuri size={64} />}
        />
      )}
    </SignInContext.Provider>
  )
}

export function useSignIn(): SignInContextValue {
  const value = useContext(SignInContext)
  if (!value) throw new Error('useSignIn must be used inside <SignInProvider>')
  return value
}

/** Bottom sheet on phones, a centered card on tablets. */
export function SignInSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { openSignIn } = useSignIn()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'bottom-0 top-auto max-w-none translate-y-0 gap-0 rounded-b-none rounded-t-[28px] border-2 border-ink/10 bg-paper px-6 pb-8 pt-0 text-center',
          'sm:bottom-auto sm:top-1/2 sm:max-w-md sm:-translate-y-1/2 sm:rounded-[28px]',
        )}
      >
        <div className="-mt-12 flex justify-center">
          <Kuri size={104} />
        </div>
        <DialogTitle className="mt-2 font-display text-[24px] font-semibold leading-snug text-ink md:text-[26px]">
          Grown-ups: sign in so Kuri can answer.
        </DialogTitle>
        <DialogDescription className="mx-auto mt-2 max-w-[32ch] text-[16px] text-ink-soft">
          Kids can keep exploring the Wonder Wall while you do.
        </DialogDescription>
        <button
          type="button"
          className={cn(primaryButton, 'mt-6 w-full')}
          onClick={() => {
            onOpenChange(false)
            openSignIn()
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className="mt-3 min-h-11 w-full rounded-pill font-display text-[17px] font-medium text-ink-soft hover:text-ink"
          onClick={() => onOpenChange(false)}
        >
          Not now
        </button>
      </DialogContent>
    </Dialog>
  )
}
