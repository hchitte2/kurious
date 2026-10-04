import { createRoot, hydrateRoot } from 'react-dom/client'
// Route-based code splitting keeps authenticated/collaborative pages out of
// the initial bundle for a public top-level route such as `/`.
import { routes } from '@generouted/react-router/lazy'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { installStaleChunkRecovery } from './stale-chunk-recovery'
// Fonts are imported here, not via @import in styles.css: Tailwind's PostCSS
// inlines @imported CSS without rebasing its relative url()s, so the font files
// 404'd in production builds. Vite rewrites url()s for CSS imported from JS.
import '@fontsource-variable/fredoka/wght.css'
import '@fontsource/andika/400.css'
import '@fontsource/andika/700.css'
import './styles.css'

async function main() {
  const root = document.getElementById('root')!
  const router = createBrowserRouter(routes)
  installStaleChunkRecovery(router)

  // Let the router finish loading the first route's code-split module before
  // rendering. Until then it renders only a loading fallback — and on a page
  // prerender.ts wrote at build (the landing), React must hydrate the
  // HTML already on screen with the real page, or it discards that markup and
  // repaints.
  if (!router.state.initialized) {
    await new Promise<void>((done) => {
      const stop = router.subscribe((state) => {
        if (state.initialized) {
          stop()
          done()
        }
      })
    })
  }

  const app = <RouterProvider router={router} />
  // A prerendered page marks the route it holds; everything else (client routes
  // are served the empty shell) renders from scratch.
  if (root.dataset.prerendered === window.location.pathname && !router.state.errors) {
    hydrateRoot(root, app, {
      // React recovers from a mismatch by repainting from scratch, so the page
      // still works — but the visitor saw a flicker and the cause is invisible
      // in `deepspace dev`, which never prerenders. Name it.
      onRecoverableError(error) {
        console.error(
          `[prerender] The static HTML for ${window.location.pathname} did not match what React rendered, so React repainted it. ` +
            'Public pages must render the same markup without a browser: no Date.now(), Math.random(), window, or matchMedia during render.',
          error,
        )
      },
    })
  } else {
    root.replaceChildren()
    createRoot(root).render(app)
  }
}

void main()
