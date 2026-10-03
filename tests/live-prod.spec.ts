/**
 * LIVE on production (paid, about $0.60): one new card per age band, then a
 * free exact-match reuse. Also seeds the Wonder Wall. Skipped unless LIVE_PROD=1:
 *   LIVE_PROD=1 npx playwright test -c tests/playwright.prod.config.ts
 */
import type { Page } from '@playwright/test'
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

test.skip(process.env.LIVE_PROD !== '1', 'Paid test: set LIVE_PROD=1 to run.')
test.skip(loadAllTestAccounts().length < 1, 'Needs a test account.')

// LIVE_QUESTION="..." [LIVE_AGES=6-8] makes just one card (no reuse step).
const ONE = process.env.LIVE_QUESTION
const CARDS = ONE
  ? [{ question: ONE, ages: process.env.LIVE_AGES ?? '6-8' }]
  : [
      { question: 'Why is it cold in winter?', ages: '4-5' },
      { question: 'Why do cats purr?', ages: '6-8' },
      { question: 'Why does the moon change shape?', ages: '9-11' },
    ]

async function ask(page: Page, question: string, ages: string) {
  await page.goto('/')
  await page.getByRole('radio', { name: `ages ${ages}`, exact: false }).check({ force: true })
  await page.locator('#question').fill(question)
  await page.getByRole('button', { name: 'Ask Kuri' }).click()
  await page.waitForURL(/\/c\/[^/?]+/, { timeout: 30_000 })
}

async function waitForReady(page: Page, label: string) {
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
  const paragraph = (await page.locator('[class*="font-read"]').first().textContent()) ?? ''
  const checked = await page.getByText('Checked', { exact: true }).isVisible()
  const chips = await page.locator('section[aria-labelledby="but-why"] button').allTextContents()
  console.log(`[${label}] ${page.url()} ${seconds}s checked=${checked}\n  ${paragraph}\n  chips: ${chips.join(' | ')}`)
  await expect(oops).toBeHidden()
  return { checked, seconds }
}

test('live prod: a card per age band, then free reuse', async ({ users }) => {
  test.setTimeout(900_000)
  // LIVE_USER="<test account name>" picks a specific account (each has its own daily cap).
  const [{ page }] = process.env.LIVE_USER ? await users([process.env.LIVE_USER]) : await users(1)
  for (const [i, card] of CARDS.entries()) {
    await ask(page, card.question, card.ages)
    await waitForReady(page, `${card.ages}`)
    await page.screenshot({ path: `test-results/prod-${i}.png`, fullPage: true })
  }
  if (ONE) return
  await ask(page, CARDS[0].question, CARDS[0].ages)
  const reuse = await waitForReady(page, 'reuse')
  expect(reuse.seconds).toBeLessThan(20)
})
