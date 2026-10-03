# Kurious: todo (one day)

Expand each block into concrete items when it starts. Tick items as they work. Full
verification happens in Block 6.

## Block 0: setup
- [x] App registered (app_01M41S66QFFMFN50BD3YHKT6AM), pushed, first deploy: https://kurious.app.space
- [x] Merge any scaffold CLAUDE.md / AGENTS.md / settings with this kit (no CLAUDE.kit.md or
      settings.kit.json existed; AGENTS.md aligned to GitHub source)
- [x] Confirm the CLI commands in CLAUDE.md (and that `npx deepspace app source` shows GitHub)
- [x] **Missing kit pieces (written by the agent):** no `.claude/settings.json` hooks (type-check on stop, secrets
      guard), no `.claude/agents/` (docs-researcher, pipeline-builder, ui-builder, code-reviewer,
      kid-content-reviewer), no `kid-explainer-style` / `misconception-cards` skills

## Block 1: spikes + contract
- [x] src/shared/card.ts (types, statuses, age bands, API shapes)
- [x] src/fixtures/cards.ts (every status, including generating states)
- [x] src/config.ts (model roles, age bands + word limits, daily cap, image style suffix)
- [x] S1 image + TTS · S2 both providers · S4 jobs · S5 files -> findings in PLAN

## Block 2: build (parallel)
- [x] pipeline: schemas, ask route (auth + cap), job: safety -> write -> illustrate + narrate -> ready
  - [x] `cards` schema: ownerField `ownerId` (NOT userBound); viewer/member read own, no
        create/update/delete. `usage` schema server-only
  - [x] Close the scaffold hole: `/ws/jobs/:roomId` + `authorizeWrite` let members enqueue
        jobs (realtime-routes.ts:169, worker.ts:72) -> admin-only
  - [x] Block the signed-out bare listing `GET /api/files?scope=app` in the file proxy
        (http-routes.ts:281); single-file GETs stay public
  - [x] Export `createActionTools` from action-routes.ts for the job's integration calls
  - [x] One job room per card (`card:<id>`), `maxAttempts: 1`, per-stage retries, guard on
        `status === 'queued'`, catch -> `status: 'error'`
  - [x] Global daily cap (`GLOBAL_DAILY_CARD_CAP`) as well as per-user
  - [x] Confirm the ElevenLabs voice once with `elevenlabs/list-voices`
  - [x] Worker routes: GET /api/wall, GET /api/cards/:id (public CardView), POST /api/cards/:id/retry
- [x] ui: design tokens + fonts, Ask screen, Card (generating + ready + declined + error), Trail, Wall

## Block 3: integrate ★ deploy
- [x] UI on real records; follow-up chain end to end; Wall route; share links

## Block 4: P1 + polish ★ deploy
- [x] Cross-provider checker + one rewrite + Checked badge
- [x] Exact-match reuse
- [x] /me page
- [x] Motion, empty/error states, phone + tablet pass

## Block 5: P2 or polish
- [ ] (skipped for time; misconceptions live in the prompts) Misconception cards + retrieval (in order: then constellation map, then voice input)

## Block 6: verify + test + ship ★ deploy
- [x] Playwright smoke tests: home loads, signed-out gate (401), card renders, Wall loads
- [x] code-reviewer + kid-content-reviewer passes; fix blockers
- [ ] The human runs the critical-path checklist
- [x] README, docs/SUBMISSION.md, final deploy, secrets sweep

## Reviews
_(2-3 lines per block)_
- **Blocks 0-1:** Live on GitHub source. The contract, fixtures and config type-check. Spikes
  changed four things: the checker is gpt-6-sol, we use `generateText` + `Output.object`, the Wall
  goes through worker routes (`wall` text column), and each card gets its own job room. Biggest
  risk: the free plan has $5 of credits, about 20 cards.
- **Blocks 2-4:** Built in parallel against the contract. The pipeline and UI merged with two
  contract changes (error codes, a null-safe normalizer). Live runs found the checker failing
  true cards on length, so length moved into code and the badge now depends on truth only.
- **Block 6:** The review blocker (trail leak) is fixed, 33 free tests pass, and the kid-content
  review drove the prompt edits. Deployed, with the deploy's transient `fetch failed` cleared by
  retries.
