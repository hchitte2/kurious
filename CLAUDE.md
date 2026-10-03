# Kurious: project memory for Claude Code

Kurious answers a kid's "why?" question with ONE card: one picture, one short paragraph read
aloud, and 2-3 "But why?" follow-up questions. Built on the DeepSpace SDK, deployed to
kurious.app.space. **We build it in one day.**

- One-day plan, feature tiers, parallel tracks: docs/PLAN.md
- Look and feel, design tokens, screen specs: docs/DESIGN.md (plus screenshots in
  docs/design/ when they land)
- Tasks: tasks/todo.md. Lessons: tasks/lessons.md (printed at session start; its rules
  override this file).

## Priorities (in this order)
1. **Ship the core flow fast.** Write code and keep moving. Don't stop to ask unless a
   decision would change the product; otherwise pick the sensible option and log it in the
   PLAN decisions log.
2. **UI/UX is the top quality bar.** It should feel delightful, obvious to a 5-year-old, and
   not like a generic AI app. Follow docs/DESIGN.md.
3. **Kid content must be true.** Use the `kid-explainer-style` skill for any prompt or
   content work.

Verification and basic tests happen in the last block of the day, not continuously. These stay
on all day anyway, because they're cheap and save time:
- type-check on stop (hook)
- the secrets guard (hook)
- sign-in + daily cap on every paid call

## Stack (from the DeepSpace scaffold; don't swap pieces out)
- **Frontend:** Vite + React + TypeScript, file-based routing, Tailwind v4, the scaffold's UI
  kit.
- **Worker:** Hono on Cloudflare Workers; Durable Objects via the SDK.
- **Imports:** `deepspace` (client), `deepspace/worker` (rooms, schemas, AI, knowledge),
  `deepspace/testing`.
- **AI:** `createDeepSpaceAI(env, provider, opts)` with AI SDK 7 (`generateObject` /
  `streamText` from `ai`). There are no provider keys in this repo; the platform proxies every
  call.

## DeepSpace rules (non-negotiable, even when moving fast)
1. **Docs are the authority.** Look up any SDK API, binding, CLI command or integration that
   this repo doesn't already use with the `deepspace-docs` MCP server or the `docs-researcher`
   subagent. Never guess signatures. Every docs page is also available as raw markdown by
   appending `.md`.
2. **Use platform primitives instead of reimplementing them:** auth, records + RBAC, real-time
   sync, background jobs, file storage, managed knowledge, and the integrations proxy.
3. **Model ids live only in `src/config.ts`** (role -> provider + modelId). No copied catalog.
4. **Owner-billed** (`'developer'`), so every paid path is sign-in gated and capped per user
   per day on the server.
5. **Cards are written only by the worker.** Clients can't create or update cards.
6. **Secrets:** never read, print or commit `.dev.vars`, `.env*` or tokens. Hooks enforce this.
7. **Integrations:** run `npx deepspace integrations info <endpoint>` before calling an
   endpoint, and read its schema.
8. **Reference apps:** `reference/storynest` (image + narration) and `reference/threadhunt`
   (background jobs, one config file) are read-only. Learn the patterns from them.

## Commands (confirm with `npx deepspace --help`; fix this list if it differs)
- **Who am I:** `npx deepspace auth whoami --json`
- **Dev server:** `npx deepspace dev start`
- **Deploy:** `npx deepspace deploy`. Commit first: deploys ship the local working tree,
  uncommitted changes included.
- **Logs:** `npx deepspace logs --follow --json`
- **Releases and rollback:** `npx deepspace releases`
- **Type-check:** `npm run type-check`
- **Feature catalog:** `npx deepspace add --list`, `npx deepspace add --info <feature>`
- **Integrations:** `npx deepspace integrations list`,
  `npx deepspace integrations info <integration>/<endpoint>`
- **Call the deployed app's tools:** `npx deepspace agent tools kurious --json`, then
  `npx deepspace agent invoke kurious <tool> --input '<json>' --json`
- **Tests (end of day):** `npx deepspace test run` or `npx deepspace test run all`
- **Exact type signatures:** `ls node_modules/deepspace/dist/*.d.ts`. The installed types are
  authoritative when the docs lag.

### Source control: GitHub is the source of truth
This repo's GitHub remote claimed the app on its first deploy. Therefore:
- **Never** run `deepspace push`, `deepspace pull` or any other DeepSpace source command.
- Commit before every deploy, so the repo always matches what's live.
- Never run `deepspace app undeploy`, `deepspace app transfer` or
  `deepspace app collaborators` without the human asking. The hooks block them.

### When a CLI command refuses
Branch on its `code` and exit code, not its prose. If it ships an `action`, run exactly that.
If it doesn't, surface the choice to the human instead of guessing.

## How we work: fast, parallel, contract-first

### 1. Plan briefly, then build
- For a block of work, write 5-10 checkable items in tasks/todo.md, then build. Don't write
  long plans.
- If an approach is going sideways after two attempts, STOP and re-plan. Don't brute-force it.
- Spikes come before the features that depend on them (docs/PLAN.md, Block 1).

### 2. Parallel subagents (use them liberally)
- **Contract first.** The main agent writes `src/shared/card.ts` (types, statuses, age bands,
  API shapes) and `src/fixtures/cards.ts` (sample cards in every status) before any track
  starts. Tracks build against the contract, not against each other.
- **File ownership.** Each track only edits its own files, which prevents collisions:
  - `pipeline-builder`: `worker.ts`, `src/worker/**`, `src/ai/**`, `src/schemas.ts`,
    `src/config.ts`, `src/integrations.ts`, `wrangler.toml`
  - `ui-builder`: `src/pages/**`, `src/components/**`, `src/styles/**`, `src/assets/**`,
    `src/fixtures/**`
  - main agent: `src/shared/**`, `docs/**`, `tasks/**`, merges, and contract changes
- A track that needs a contract change asks the main agent; it never edits shared files
  itself.
- Use `docs-researcher` for every DeepSpace question, so builder contexts stay clean.
- One task per subagent invocation, with a clear "done when" line.

### 3. Self-improvement loop
- After any correction from the human, add a one-line rule to tasks/lessons.md.

### 4. "Done" while building (quick checks)
- It type-checks, and the touched flow works once in the dev server (or, for UI, renders from
  fixtures).
- The full verification pass, the tests and the reviewer subagents run in Block 6. Don't spend
  time on them earlier unless something is broken.

### 5. Demand elegance (balanced)
- Prefer the SDK primitive or the simpler path. Don't over-engineer; this is a one-day build.

### 6. Autonomous bug fixing
- Read the error, form a hypothesis, test it, fix the root cause. No `any` or `@ts-ignore` to
  silence things.

## Core principles
- **Simplicity first:** the smallest change that works; touch only what's needed.
- **No laziness:** root causes, not temporary hacks.
- **Every external call has four UI states:** loading, error with a local retry, empty, and
  success. Use the SDK's `useAsyncResource` / `usePagedResource` hooks.
- **Commit at the end of every block:** `git add -A && git commit -m "<block>: <what shipped>"`.
