import { defineConfig } from '@playwright/test'

/**
 * Runs the opt-in LIVE specs against the deployed app (no local server):
 *   LIVE_PROD=1 npx playwright test -c tests/playwright.prod.config.ts
 * Paid: each new card costs about $0.20 of the owner's credits.
 */
export default defineConfig({
  testDir: '.',
  testMatch: 'live-prod.spec.ts',
  timeout: 900_000,
  retries: 0,
  use: { baseURL: process.env.PROD_URL ?? 'https://kurious.app.space', headless: true },
})
