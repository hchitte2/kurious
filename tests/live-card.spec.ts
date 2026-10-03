/**
 * LIVE end-to-end card: costs real credits (one card + one follow-up, about
 * $0.40 on the free plan). Skipped unless LIVE_CARD=1:
 *   LIVE_CARD=1 npx deepspace test run all --grep "live card"
 *
 * Signs in a test account, asks a question, waits for the card to reach
 * ready (picture + narration), taps a "But why?" chip, then re-asks the first
 * question and expects an instant reuse.
 */
import type { Page } from '@playwright/test'
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

const QUESTION = 'Why is it cold in winter?'

test.skip(process.env.LIVE_CARD !== '1', 'Paid test: set LIVE_CARD=1 to run.')
test.skip(loadAllTestAccounts().length < 1, 'Needs a test account (npx deepspace test accounts create).')

async function waitForReadyCard(page: Page, label: string) {
  const picture = page.locator('img[alt^="A picture for"]')
  const play = page.getByRole('button', { name: 'Read it to me' })
  const oops = page.getByText(/paintbrush slipped/i)
  const started = Date.now()
  await expect
    .poll(
      async () => {
        if (await oops.isVisible()) return 'error'
        const loaded = await picture
          .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)
          .catch(() => false)
        return loaded && (await play.isVisible()) ? 'ready' : 'waiting'
      },
      { timeout: 300_000, intervals: [2_000] },
    )
    .not.toBe('waiting')
  const seconds = Math.round((Date.now() - started) / 1000)
  const paragraph = (await page.locator('p.font-read, [class*="font-read"]').first().textContent()) ?? ''
  const checked = await page.getByText('Checked', { exact: true }).isVisible()
  console.log(`[${label}] ${page.url()} in ${seconds}s, checked=${checked}\n${paragraph}`)
  await expect(oops).toBeHidden()
  return { paragraph, checked, seconds }
}

test('live card: ask -> ready -> follow-up -> reuse', async ({ users }) => {
  test.setTimeout(900_000)
  const [user] = await users(1)
  const { page } = user

  await page.goto('/')
  await page.locator('#question').fill(QUESTION)
  await page.getByRole('button', { name: 'Ask Kuri' }).click()
  await page.waitForURL(/\/c\/[^/?]+/, { timeout: 30_000 })
  const firstUrl = page.url()

  const first = await waitForReadyCard(page, 'first')
  expect(first.paragraph.length).toBeGreaterThan(40)
  await page.screenshot({ path: 'test-results/live-first.png', fullPage: true })

  // Follow-up chip -> a new linked card with a trail.
  const chip = page.locator('section[aria-labelledby="but-why"] button').first()
  const chipText = (await chip.textContent())?.trim() ?? ''
  await chip.click()
  await page.waitForURL((url) => url.href !== firstUrl && /\/c\//.test(url.pathname), { timeout: 30_000 })
  await expect(page.getByRole('navigation', { name: 'Your question trail' })).toBeVisible({ timeout: 30_000 })
  console.log(`[follow-up] tapped "${chipText}"`)
  await waitForReadyCard(page, 'follow-up')
  await page.screenshot({ path: 'test-results/live-followup.png', fullPage: true })

  // Same question again: reused instantly (free), so it is ready right away.
  await page.goto('/')
  await page.locator('#question').fill(QUESTION)
  await page.getByRole('button', { name: 'Ask Kuri' }).click()
  await page.waitForURL(/\/c\/[^/?]+/, { timeout: 30_000 })
  const again = await waitForReadyCard(page, 'reuse')
  expect(again.seconds).toBeLessThan(20)
})
