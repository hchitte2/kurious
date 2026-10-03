import { expect, type APIResponse, type Page } from '@playwright/test'

/** Wait for the React app shell (present on every page, static and dynamic). */
export async function waitForApp(page: Page) {
  await page.waitForSelector('[data-testid="app-root"]', { timeout: 15_000 })
}

/** Wait for the dynamic (app) boundary: providers mounted, top bar rendered. */
export async function waitForTopBar(page: Page) {
  await expect(page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
}

/**
 * Record every request whose path starts with one of `prefixes`. Kurious'
 * paid routes must never be hit by the free suite, so specs assert this
 * stays empty where no request is expected.
 */
export function trackRequests(page: Page, prefixes: string[]): string[] {
  const seen: string[] = []
  page.on('request', (req) => {
    const { pathname } = new URL(req.url())
    if (prefixes.some((p) => pathname.startsWith(p))) seen.push(`${req.method()} ${pathname}`)
  })
  return seen
}

/**
 * A Bearer JWT for the signed-in browser context, minted exactly the way the
 * SDK's getAuthToken() does it (POST /api/auth/token with the session cookie).
 * Call after the page has loaded the app.
 */
export async function bearerFor(page: Page): Promise<string> {
  const token = await page.evaluate(async () => {
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    const body = (await res.json().catch(() => null)) as { token?: unknown } | null
    return typeof body?.token === 'string' ? body.token : null
  })
  expect(token, 'signed-in context should mint a JWT').toBeTruthy()
  return token as string
}

/** Parse a JSON body, failing the test with the raw text if it isn't JSON. */
export async function jsonOf(res: APIResponse): Promise<Record<string, unknown>> {
  const text = await res.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`Expected JSON from ${res.url()} (${res.status()}), got: ${text.slice(0, 200)}`)
  }
}

/** The CardView keys (src/shared/card.ts). Public routes must return nothing else. */
export const CARD_VIEW_KEYS = [
  'id',
  'question',
  'ageBand',
  'status',
  'paragraph',
  'keyIdea',
  'followUps',
  'imageUrl',
  'audioUrl',
  'trail',
  'checked',
  'isPublic',
  'createdAt',
  'updatedAt',
] as const
