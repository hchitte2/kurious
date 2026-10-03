/**
 * Dynamic app boundary: the auth + realtime data layer, plus the Kurious
 * chrome (top bar, sign-in overlay). `(app)` is a route group, so it does not
 * appear in URLs: (app)/wall.tsx is /wall.
 *
 * Every page that needs `useAuth`, `useQuery`, etc. lives under this folder.
 * The static pages at the top level of src/pages/ (about, 404) mount none of it.
 */

import { Suspense, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { DeepSpaceAuthProvider, RecordProvider, RecordScope, useAuthStatus } from 'deepspace'
import { useToast } from '@/components/ui'
import { Kuri } from '../../components/kurious/Kuri'
import { SignInProvider } from '../../components/kurious/SignIn'
import { TopBar } from '../../components/kurious/TopBar'
import { SCOPE_ID } from '../../constants'
import { schemas } from '../../schemas'

export default function AppLayout() {
  return (
    <DeepSpaceAuthProvider>
      <title>Kurious</title>
      <AuthBoot>
        <SignInProvider>
          <div className="flex min-h-screen flex-col">
            <TopBar />
            <main className="flex-1">
              <Suspense fallback={<PageLoading />}>
                <Outlet />
              </Suspense>
            </main>
          </div>
        </SignInProvider>
      </AuthBoot>
    </DeepSpaceAuthProvider>
  )
}

function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
      <Kuri state="thinking" size={88} label="Loading" />
    </div>
  )
}

/**
 * Waits for auth to resolve, then mounts the data layer. While the first
 * session check is in flight it shows plain paper (index.html primes <html>
 * with the same color), so a cold load never flashes.
 */
function AuthBoot({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuthStatus()
  // Record writes are fire-and-forget; route rejections to toasts so they are
  // never silent. (Kurious clients never write cards, but keep the wiring.)
  const { error, warning } = useToast()

  if (!isLoaded) {
    return <div aria-busy="true" className="fixed inset-0 bg-paper" />
  }

  return (
    <RecordProvider
      allowAnonymous
      onWriteError={(e) => (e.kind === 'permission' ? warning(e.title, e.detail) : error(e.title, e.detail))}
    >
      <RecordScope roomId={SCOPE_ID} schemas={schemas}>
        {children}
      </RecordScope>
    </RecordProvider>
  )
}
