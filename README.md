# Kurious

**Live:** https://kurious.app.space

A kid asks "why?". Kurious answers with **one card**: one picture, one short paragraph read
aloud, and 2-3 "But why?" follow-ups that keep the trail of wonder going. Every answer is
written for the child's age and checked by a second AI from a different company before it
earns a "Checked" badge.

Built in one day on the [DeepSpace SDK](https://docs.deep.space) (Cloudflare Workers + React).

## How a card is made
```
POST /api/ask  ->  sign-in + daily caps  ->  exact-match reuse?  ->  card {queued}  ->  background job
job:  safety (Claude Haiku)  ->  misconceptions (managed knowledge)  ->  write (Claude Sonnet)
      ->  check (GPT-6, one rewrite if needed)
      ->  picture (Gemini image) + narration (OpenAI TTS) in parallel  ->  app file storage  ->  ready
```
Each stage writes the card record, and the page updates live: the paragraph appears as soon as
it's written, the picture paints in, and the play button wakes up when the narration is ready.

## What's where
| Path | What |
|---|---|
| `src/shared/card.ts` | The contract: card shape, statuses, age bands, API routes and shapes |
| `src/config.ts` | Model roles (provider + model id), caps, age-band writing rules, media endpoints |
| `worker.ts`, `src/server/`, `src/ai/`, `src/jobs.ts` | Worker: routes, the card job, AI stages |
| `src/schemas/` | Collections and RBAC (cards are written only by the worker) |
| `src/pages/`, `src/components/`, `src/hooks/` | The UI: Ask, Card, Wonder Wall, My questions |
| `src/knowledge/` | 26 misconception cards, seeded into managed knowledge and retrieved per card |
| `src/ai/tools.ts` | Local agent tools (`npx deepspace agent tools kurious`) |
| `src/fixtures/cards.ts` | A sample card in every state (add `?fixtures` to any page URL) |
| `docs/` | Plan, design, verification log, submission note |

## Run it
```sh
npm install
npx deepspace auth login
npx deepspace dev start      # http://localhost:5173  (add ?fixtures to browse every card state)
npm run type-check
npx deepspace test run all   # Playwright smoke tests (needs a test account)
```

## Deploy
GitHub is this app's source of truth. Commit and push first, then:
```sh
npx deepspace deploy
```

## Guardrails
- Sign-in required for any paid call; per-user and global daily caps enforced on the server.
- Cards are written only by the worker; clients can't create or edit them.
- The Wonder Wall shows only cards that passed safety and the cross-provider check, contain
  nothing personal, and have a picture. Owner ids never leave the worker.
