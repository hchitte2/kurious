/**
 * Kurious API contract (src/shared/card.ts, src/server/card-routes.ts).
 *
 * FREE by construction. Every request here is rejected before any paid
 * work: signed out (401), invalid body (400), unknown parent (404, checked
 * before reuse and the daily cap), unknown card (404). Nothing ever reaches
 * the writer, the picture or the narration.
 */

import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
import { bearerFor, CARD_VIEW_KEYS, jsonOf, waitForTopBar } from './helpers/kurious'

function expectAskError(body: Record<string, unknown>, error: string) {
  expect(body).toMatchObject({ ok: false, error })
  expect(typeof body.message).toBe('string')
}

test.describe('Platform', () => {
  test('auth proxy forwards to the auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('the Ask page connects the records WebSocket', async ({ page }) => {
    // Ask (/) is dynamic (under src/pages/(app)/): mounting it boots the
    // providers, which auto-connect the records socket.
    const socket = page.waitForEvent('websocket', {
      predicate: (ws) => new URL(ws.url()).pathname.startsWith('/ws/'),
      timeout: 15_000,
    })
    await page.goto('/')
    await waitForTopBar(page)
    expect(new URL((await socket).url()).pathname).toMatch(/^\/ws\//)
  })
})

test.describe('Signed out', () => {
  test('POST /api/ask -> 401 unauthenticated', async ({ request }) => {
    const res = await request.post('/api/ask', { data: { question: 'Why is the sky blue?', ageBand: 'little' } })
    expect(res.status()).toBe(401)
    expectAskError(await jsonOf(res), 'unauthenticated')
  })

  test('POST /api/ask with an invalid body -> still 401 (auth before validation)', async ({ request }) => {
    const res = await request.post('/api/ask', { data: { question: 1, ageBand: 'toddler' } })
    expect(res.status()).toBe(401)
    expectAskError(await jsonOf(res), 'unauthenticated')
  })

  test('POST /api/ask with a forged bearer -> 401', async ({ request }) => {
    const res = await request.post('/api/ask', {
      headers: { Authorization: 'Bearer not-a-real-jwt' },
      data: { question: 'Why is the sky blue?', ageBand: 'little' },
    })
    expect(res.status()).toBe(401)
    expectAskError(await jsonOf(res), 'unauthenticated')
  })

  test('POST /api/cards/:id/retry -> 401 unauthenticated', async ({ request }) => {
    const res = await request.post('/api/cards/x/retry', { data: {} })
    expect(res.status()).toBe(401)
    expectAskError(await jsonOf(res), 'unauthenticated')
  })

  test('GET /api/files?scope=app (bare app listing) -> 401/403', async ({ request }) => {
    for (const path of ['/api/files?scope=app', '/api/files/?scope=app']) {
      const res = await request.get(path)
      expect([401, 403], `${path} answered ${res.status()}`).toContain(res.status())
    }
  })

  test('DELETE /api/files/<key> (any write) -> 401', async ({ request }) => {
    const res = await request.delete('/api/files/__test-nonexistent__.txt')
    expect(res.status()).toBe(401)
  })
})

test.describe('Public reads', () => {
  test('GET /api/wall -> 200 WallPage of public, ready CardViews', async ({ request }) => {
    const res = await request.get('/api/wall')
    expect(res.status()).toBe(200)
    const body = await jsonOf(res)
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.nextCursor === null || typeof body.nextCursor === 'string').toBe(true)

    for (const item of body.items as Record<string, unknown>[]) {
      // CardView only: ownerId, safety, check and errorMessage never leave the worker.
      for (const key of Object.keys(item)) expect(CARD_VIEW_KEYS as readonly string[]).toContain(key)
      expect(item).toMatchObject({ status: 'ready', isPublic: true })
      expect(typeof item.id).toBe('string')
      expect(typeof item.question).toBe('string')
    }
  })

  test('GET /api/wall?limit=1 -> at most one item', async ({ request }) => {
    const res = await request.get('/api/wall?limit=1')
    expect(res.status()).toBe(200)
    const body = await jsonOf(res)
    expect((body.items as unknown[]).length).toBeLessThanOrEqual(1)
  })

  test('GET /api/cards/:id for a Wall card -> 200 PublicCardResponse', async ({ request }) => {
    const wall = await jsonOf(await request.get('/api/wall?limit=1'))
    const first = (wall.items as Array<{ id: string }>)[0]
    test.skip(!first, 'The Wall is empty in this dev database.')
    const res = await request.get(`/api/cards/${encodeURIComponent(first.id)}`)
    expect(res.status()).toBe(200)
    const body = await jsonOf(res)
    expect(body).toMatchObject({ ok: true, card: { id: first.id, isPublic: true } })
  })

  test('GET /api/cards/does-not-exist -> 404 not_found', async ({ request }) => {
    const res = await request.get('/api/cards/does-not-exist')
    expect(res.status()).toBe(404)
    expect(await jsonOf(res)).toEqual({ ok: false, error: 'not_found' })
  })
})

test.describe('Signed in (free paths only)', () => {
  const usable = loadAllTestAccounts().length
  test.skip(usable < 1, `Needs 1 usable test account, found ${usable}.`)

  test('ask validation, unknown parent and unknown retry are all rejected before any paid work', async ({
    users,
  }) => {
    const [{ page }] = await users(1)
    await page.goto('/')
    await waitForTopBar(page)
    const headers = { Authorization: `Bearer ${await bearerFor(page)}` }

    // Auth passes, validation fails: 400.
    for (const data of [
      { question: 'Hi', ageBand: 'little' },
      { question: 'Why is the sky blue?', ageBand: 'toddler' },
      { question: 'x'.repeat(161), ageBand: 'kid' },
    ]) {
      const res = await page.request.post('/api/ask', { headers, data })
      expect(res.status(), JSON.stringify(data).slice(0, 60)).toBe(400)
      expectAskError(await jsonOf(res), 'invalid_question')
    }

    // A follow-up of a card that isn't yours is refused before reuse or the cap.
    const parent = await page.request.post('/api/ask', {
      headers,
      data: { question: 'Why is the sky blue?', ageBand: 'little', parentCardId: 'does-not-exist' },
    })
    expect(parent.status()).toBe(404)
    expectAskError(await jsonOf(parent), 'parent_not_found')

    // Retrying a card you don't own is a 404, not a paid re-run.
    const retry = await page.request.post('/api/cards/does-not-exist/retry', { headers, data: {} })
    expect(retry.status()).toBe(404)
    expectAskError(await jsonOf(retry), 'not_found')
  })
})

test.describe('Auth redirects', () => {
  test('social sign-in lands on the Ask page, not a removed route', async ({ request }) => {
    const res = await request.get('/api/auth/oauth-complete', { maxRedirects: 0 })
    expect(res.status()).toBe(302)
    expect(new URL(res.headers().location).pathname).toBe('/')
  })
})
