# Kurious: todo (one day)

Expand each block into concrete items when it starts. Tick items as they work. Full
verification happens in Block 6.

## Block 0: setup
- [ ] Merge any scaffold CLAUDE.md / AGENTS.md / settings with this kit
- [ ] Confirm the CLI commands in CLAUDE.md (and that `npx deepspace app source` shows GitHub)

## Block 1: spikes + contract
- [ ] src/shared/card.ts (types, statuses, age bands, API shapes)
- [ ] src/fixtures/cards.ts (every status, including generating states)
- [ ] src/config.ts (model roles, age bands + word limits, daily cap, image style suffix)
- [ ] S1 image + TTS · S2 both providers · S4 jobs · S5 files -> findings in PLAN

## Block 2: build (parallel)
- [ ] pipeline: schemas, ask route (auth + cap), job: safety -> write -> illustrate + narrate -> ready
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
