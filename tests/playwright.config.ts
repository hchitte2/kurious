import { defineConfig } from '@playwright/test'

/**
 * Port comes from $DEEPSPACE_PORT (set by `deepspace test run [--port N]`),
 * defaulting to 5173. The same port is passed to vite via --strictPort so
 * a busy address fails fast rather than silently rebinding to 5174.
 *
 * The test runner owns this server. A busy port is a hard failure so a test
 * can never attach to an unrelated or shutting-down app. To run suites in
 * parallel, give each one a different --port.
 */
const PORT = Number(process.env.DEEPSPACE_PORT ?? 5173)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  // Dev-server pages are lazy routes behind an auth boot; on a busy machine
  // the first visit to a route can take well over the 5s expect default.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  use: {
    baseURL: BASE_URL,
    headless: true,
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --host`,
    cwd: '..',
    // Readiness gates on the auth plane, not just vite: /api/auth/ok only
    // answers once workerd behind /api/* has booted, so no test starts
    // against a half-up server. Playwright keeps polling through non-OK
    // responses and fails setup with its own clear error at the timeout.
    url: `${BASE_URL}/api/auth/ok`,
    reuseExistingServer: false,
    // A cold start (vite + ESLint checker + workerd) measured ~45s before
    // /api/auth/ok answered, so 60s left no headroom when a second dev
    // server is running alongside.
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
