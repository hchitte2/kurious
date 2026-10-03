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
- [ ] pipeline: schemas, ask route (auth + cap), job: safety -> write -> illustrate + narrate -> ready
  - [ ] `cards` schema: ownerField `ownerId` (NOT userBound); viewer/member read own, no
        create/update/delete. `usage` schema server-only
  - [ ] Close the scaffold hole: `/ws/jobs/:roomId` + `authorizeWrite` let members enqueue
        jobs (realtime-routes.ts:169, worker.ts:72) -> admin-only
  - [ ] Block the signed-out bare listing `GET /api/files?scope=app` in the file proxy
        (http-routes.ts:281); single-file GETs stay public
  - [ ] Export `createActionTools` from action-routes.ts for the job's integration calls
  - [ ] One job room per card (`card:<id>`), `maxAttempts: 1`, per-stage retries, guard on
        `status === 'queued'`, catch -> `status: 'error'`
  - [ ] Global daily cap (`GLOBAL_DAILY_CARD_CAP`) as well as per-user
  - [ ] Confirm the ElevenLabs voice once with `elevenlabs/list-voices`
  - [ ] Worker routes: GET /api/wall, GET /api/cards/:id (public CardView), POST /api/cards/:id/retry
- [ ] ui: design tokens + fonts, Ask screen, Card (generating + ready + declined + error), Trail, Wall

## Block 3: integrate ★ deploy
- [ ] UI on real records; follow-up chain end to end; Wall route; share links

## Block 4: P1 + polish ★ deploy
- [ ] Cross-provider checker + one rewrite + Checked badge
- [ ] Exact-match reuse
- [ ] /me page
- [ ] Motion, empty/error states, phone + tablet pass

## Block 5: P2 or polish
- [ ] Misconception cards + retrieval (in order: then constellation map, then voice input)

## Block 6: verify + test + ship ★ deploy
- [ ] Playwright smoke tests: home loads, signed-out gate (401), card renders, Wall loads
- [ ] code-reviewer + kid-content-reviewer passes; fix blockers
- [ ] The human runs the critical-path checklist
- [ ] README, docs/SUBMISSION.md, final deploy, secrets sweep

## Reviews
_(2-3 lines per block)_
- **Blocks 0-1:** Live on GitHub source. The contract, fixtures and config type-check. Spikes
  changed four things: the checker is gpt-6-sol, we use `generateText` + `Output.object`, the Wall
  goes through worker routes (`wall` text column), and each card gets its own job room. Biggest
  risk: the free plan has $5 of credits, about 20 cards.
