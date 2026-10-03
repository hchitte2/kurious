/**
 * Multi-user spec: two grown-ups sign in in separate browser contexts and the
 * app shows each one their own account (no shared session).
 *
 * Kurious has no shared real-time surface (cards are owner-read-only; the
 * Wall goes through a worker route), so this is the only two-user check.
 *
 * `users(2)` takes any two accounts from your pool. With fewer than two
 * usable accounts on this machine the file skips:
 *   npx deepspace test accounts list --usable
 *   npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" --password-stdin
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

const usableTestAccounts = loadAllTestAccounts().length
test.skip(
  usableTestAccounts < 2,
  `Needs 2 usable test accounts, found ${usableTestAccounts}. Create them with ` +
    '`npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" ' +
    '--password-stdin`, or fetch existing pool accounts with `npx deepspace test accounts recover --all`.',
)

test('each browser renders its own signed-in grown-up', async ({ users }) => {
  const [a, b] = await users(2)

  // Ask (/) is dynamic (under src/pages/(app)/), so it mounts the top bar.
  await Promise.all([a.page.goto('/'), b.page.goto('/')])

  // Email, not name: the page renders the session's `name || email`, while
  // `user.name` comes from the local account registry. The two accounts are
  // distinct, so two exact email matches prove the contexts don't share a
  // session.
  for (const user of [a, b]) {
    await expect(user.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
    await expect(user.page.getByTestId('nav-user-name')).toHaveText(/\S/, { timeout: 15_000 })

    await user.page.getByRole('button', { name: 'Grown-up menu' }).click()
    await expect(user.page.getByTestId('nav-user-email')).toHaveText(user.email, { timeout: 15_000 })
  }
})
