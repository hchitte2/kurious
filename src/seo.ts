/**
 * Public-page SEO: what search engines, AI answer engines and link previews
 * see. Read by <Seo> at runtime and by prerender.ts at build (see
 * src/prerender-entry.tsx for which pages are prerendered).
 */

/** Injected by prerender.ts: `https://<name>.app.space` from wrangler.toml, or
 *  what `deepspace deploy` passes. Absent in unit tests, hence the guard. */
declare const __DEEPSPACE_SITE_ORIGIN__: string | undefined

export const seo = {
  title: 'Kurious | One true answer to every why',
  description:
    'Kids ask why. Kuri the owl answers with one picture, one short paragraph read aloud, and “But why?” questions to keep exploring.',
  /** Public origin for canonical URLs, og:url and the sitemap, no trailing slash. */
  origin: typeof __DEEPSPACE_SITE_ORIGIN__ === 'string' ? __DEEPSPACE_SITE_ORIGIN__ : 'http://localhost',
  noindex: false,
}
