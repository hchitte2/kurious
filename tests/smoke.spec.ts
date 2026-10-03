/**
 * Kurious smoke tests: every screen renders real content, and the ask gate
 * holds. FREE by construction: nothing here can start a paid card. Signed-out
 * asks are asserted to send no request at all, and every card state is
 * rendered from fixtures (`?fixtures`, src/fixtures/cards.ts).
 *
 * Page kinds:
 *   - static (top level of src/pages/): /about and the 404. No providers, so
 *     no auth fetch and no records WebSocket.
 *   - dynamic (src/pages/(app)/): / (Ask), /wall, /c/:id, /me.
 */

import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
import { captureConsoleErrors } from './helpers/errors'
import { trackRequests, waitForApp, waitForTopBar } from './helpers/kurious'

const PAID_ROUTES = ['/api/ask', '/api/cards/']

test.describe('Ask (/)', () => {
  test('renders the question, the input and the ask button, signed out', async ({ page }) => {
    await page.goto('/')
    await waitForTopBar(page)
    await expect(page.getByRole('heading', { level: 1, name: 'What are you wondering about?' })).toBeVisible()
    await expect(page.getByLabel('Your question')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ask Kuri' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Or tap a wonder' })).toBeVisible()
    // Dynamic, not gated: the sign-in overlay must not appear on load.
    await expect(page.getByTestId('nav-sign-in-button')).toBeVisible()
    await expect(page.getByTestId('nav-user-name')).toHaveCount(0)
    await expect(page.locator('[data-testid="auth-overlay"]')).toHaveCount(0)
  })

  test('an empty ask shows a hint and sends nothing', async ({ page }) => {
    const sent = trackRequests(page, PAID_ROUTES)
    await page.goto('/')
    await page.getByRole('button', { name: 'Ask Kuri' }).click()
    await expect(page.getByRole('alert')).toContainText('Type a question first')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(sent).toEqual([])
  })

  test('signed out, asking opens the grown-up sign-in sheet and sends no request', async ({ page }) => {
    const sent = trackRequests(page, PAID_ROUTES)
    await page.goto('/')
    await waitForTopBar(page)
    await page.getByLabel('Your question').fill('Why is the sky blue?')
    await page.getByRole('button', { name: 'Ask Kuri' }).click()

    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText('Grown-ups: sign in so Kuri can answer.')

    // "Sign in" hands over to the SDK's sign-in overlay.
    await sheet.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('[data-testid="auth-overlay"]')).toBeVisible()

    await page.waitForTimeout(300)
    expect(sent).toEqual([])
  })

  test('signed out, tapping a wonder bubble also opens the sheet', async ({ page }) => {
    const sent = trackRequests(page, PAID_ROUTES)
    await page.goto('/')
    await page.getByRole('button', { name: 'Why does ice float?' }).click()
    await expect(page.getByRole('dialog')).toContainText('Grown-ups: sign in so Kuri can answer.')
    await page.getByRole('button', { name: 'Not now' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(sent).toEqual([])
  })

  test('fixture mode: asking a known question opens its card (no network)', async ({ page }) => {
    const sent = trackRequests(page, PAID_ROUTES)
    await page.goto('/?fixtures')
    await page.getByLabel('Your question').fill('Why is the sky blue?')
    await page.getByRole('button', { name: 'Ask Kuri' }).click()
    await page.waitForURL('**/c/fx-sky')
    await expect(page.getByRole('heading', { level: 1, name: 'Why is the sky blue?' })).toBeVisible()
    expect(sent).toEqual([])
  })
})

test.describe('Wonder Wall (/wall)', () => {
  test('loads: the empty state or tiles, never the error', async ({ page }) => {
    await page.goto('/wall')
    await waitForTopBar(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Wonder Wall' })).toBeVisible()
    const empty = page.getByRole('heading', { name: 'No wonders yet. Be the first!' })
    const tile = page.locator('main ul a[href^="/c/"]').first()
    await expect(empty.or(tile)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('The Wonder Wall is hiding.')).toHaveCount(0)
  })

  test('fixture mode: shows the public, ready tiles only', async ({ page }) => {
    await page.goto('/wall?fixtures')
    const tiles = page.locator('main ul a[href^="/c/"]')
    await expect(tiles.filter({ hasText: 'Why is the sky blue?' })).toBeVisible()
    // Declined and errored fixtures never reach the Wall.
    await expect(tiles.filter({ hasText: 'Why does my tummy hurt every day?' })).toHaveCount(0)
    await expect(tiles.filter({ hasText: 'Why is the ocean salty?' })).toHaveCount(0)
    await expect(page.getByText('That’s every wonder so far.')).toBeVisible()
  })
})

test.describe('Card (/c/:id)', () => {
  test('ready card: picture, paragraph, "But why?" chips, Checked badge', async ({ page }) => {
    await page.goto('/c/fx-sky?fixtures')
    await expect(page.getByRole('heading', { level: 1, name: 'Why is the sky blue?' })).toBeVisible()

    const picture = page.getByRole('img', { name: 'A picture for “Why is the sky blue?”' })
    await expect(picture).toBeVisible()
    await expect
      .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true)

    await expect(page.locator('p.font-read')).toContainText('Sunlight looks white')
    await expect(page.getByRole('button', { name: 'Read it to me' })).toBeVisible()

    await expect(page.getByRole('heading', { level: 2, name: 'But why?' })).toBeVisible()
    const chips = page.locator('section[aria-labelledby="but-why"] button')
    await expect(chips).toHaveCount(3)
    await expect(chips.first()).toHaveText('Why is the sunset orange?')

    await expect(page.getByText('Checked', { exact: true })).toBeVisible()
    await expect(page.getByText('Ages 4-5')).toBeVisible()
    await expect(page.getByText('Oops, my paintbrush slipped.')).toHaveCount(0)
  })

  test('tapping a "But why?" chip opens the linked card with its trail', async ({ page }) => {
    const sent = trackRequests(page, PAID_ROUTES)
    await page.goto('/c/fx-sky?fixtures')
    await page.getByRole('button', { name: 'Why is the sunset orange?' }).click()
    await page.waitForURL('**/c/fx-sunset')
    await expect(page.getByRole('heading', { level: 1, name: 'Why is the sunset orange?' })).toBeVisible()
    const trail = page.getByRole('navigation', { name: 'Your question trail' })
    await expect(trail).toBeVisible()
    await expect(trail.getByRole('link', { name: 'Back to: Why is the sky blue?' })).toBeVisible()
    expect(sent).toEqual([])
  })

  test('errored card keeps its paragraph and offers Retry', async ({ page }) => {
    const sent = trackRequests(page, PAID_ROUTES)
    await page.goto('/c/fx-error-partial?fixtures')
    await expect(page.getByRole('heading', { level: 1, name: 'Why is the ocean salty?' })).toBeVisible()
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Oops, my paintbrush slipped.')
    const retry = alert.getByRole('button', { name: 'Retry' })
    await expect(retry).toBeVisible()
    await expect(page.locator('p.font-read')).toContainText('Rain slowly wears away')
    await expect(page.getByText('Checked', { exact: true })).toHaveCount(0)

    // Fixture retry is local: it must not reach the worker.
    await retry.click()
    await expect(alert.getByRole('button', { name: 'Retry' })).toBeEnabled()
    expect(sent).toEqual([])
  })

  test('declined card redirects to a grown-up, with no picture or answer', async ({ page }) => {
    await page.goto('/c/fx-declined?fixtures')
    await expect(page.getByRole('heading', { name: /great question to ask a grown-up you trust/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Why does the moon change shape?' })).toBeVisible()
    await expect(page.getByRole('img', { name: /^A picture for/ })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'But why?' })).toHaveCount(0)
    await expect(page.locator('p.font-read')).toHaveCount(0)
  })

  test('generating card shows the stage row', async ({ page }) => {
    await page.goto('/c/fx-sun-night?fixtures')
    await expect(page.getByRole('heading', { level: 1, name: 'Where does the sun go at night?' })).toBeVisible()
    await expect(page.getByText('Kuri is painting your picture…')).toBeVisible()
    await expect(page.getByText('Painting (now)')).toBeAttached()
  })

  test('unknown fixture card shows the friendly not-found', async ({ page }) => {
    await page.goto('/c/fx-nope?fixtures')
    await expect(page.getByRole('heading', { level: 1, name: /can.t find that card/ })).toBeVisible()
  })

  test('signed out, a private or missing card shows the friendly not-found', async ({ page }) => {
    await page.goto('/c/does-not-exist')
    await expect(page.getByRole('heading', { level: 1, name: /can.t find that card/ })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('link', { name: 'Ask something new' })).toBeVisible()
  })
})

test.describe('Static pages', () => {
  test('/about renders without JS errors', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    await page.goto('/about')
    await waitForApp(page)
    await expect(page.getByTestId('static-landing')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'For grown-ups' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'How a card is made' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('/about carries one title, one description, one canonical', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByTestId('static-landing')).toBeVisible()
    await expect(page).toHaveTitle(/Kurious/)
    expect(await page.locator('head meta[name="description"]').count()).toBe(1)
    expect(await page.locator('head link[rel="canonical"]').count()).toBe(1)
  })

  test('static contract: /about fires no auth request and opens no websocket', async ({ page }) => {
    const offenders: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/')) offenders.push(req.url())
    })
    // Only the DO room route counts; vite's own HMR socket is a dev artifact.
    page.on('websocket', (ws) => {
      if (new URL(ws.url()).pathname.startsWith('/ws/')) offenders.push(`ws: ${ws.url()}`)
    })
    await page.goto('/about')
    await expect(page.getByTestId('static-landing')).toBeVisible()
    await page.waitForTimeout(1500)
    expect(offenders).toEqual([])
    await expect(page.locator('[data-testid="auth-overlay"]')).toHaveCount(0)
  })

  test('unknown route shows the friendly 404', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    await waitForApp(page)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Hmm, Kuri looked everywhere for this page.' }),
    ).toBeVisible()
    await expect(page).toHaveTitle('Page not found | Kurious')
    await page.getByRole('link', { name: 'Ask something new' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'What are you wondering about?' })).toBeVisible()
  })
})

test.describe('Signed in', () => {
  const usable = loadAllTestAccounts().length
  test.skip(
    usable < 1,
    `Needs 1 usable test account, found ${usable}. Create one with ` +
      '`npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" --password-stdin`.',
  )

  test('the top bar shows the grown-up and their menu', async ({ users }) => {
    const [user] = await users(1)
    const { page } = user
    await page.goto('/')
    await waitForTopBar(page)
    await expect(page.getByTestId('nav-sign-in-button')).toHaveCount(0)
    await expect(page.getByTestId('nav-user-name')).toHaveText(/\S/, { timeout: 15_000 })

    await page.getByRole('button', { name: 'Grown-up menu' }).click()
    await expect(page.getByTestId('nav-user-email')).toHaveText(user.email)
    await expect(page.getByRole('menuitem', { name: 'My questions' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible()
  })

  test('/me lists the trails (or the empty state), not the sign-in prompt', async ({ users }) => {
    const [{ page }] = await users(1)
    await page.goto('/me')
    await expect(page.getByRole('heading', { level: 1, name: 'My questions' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Grown-ups: sign in to see your trails.')).toHaveCount(0)
    const empty = page.getByRole('heading', { name: 'No questions yet.' })
    const trail = page.locator('main ul > li').first()
    await expect(empty.or(trail)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Kuri can’t find your trails right now.')).toHaveCount(0)
  })
})
