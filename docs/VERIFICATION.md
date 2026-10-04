# Verification log

This log becomes the "what the agent did / what I verified" part of the submission.
Verification is batched into Block 6 (end of day). Be honest: mark who actually checked each thing.

## Critical path (the human runs these on the deployed app in Block 6)
- [x] Signed out, a visitor can browse the Wonder Wall and open a shared card (human)
- [x] Signed out, a visitor cannot ask: the UI is gated and `/api/ask` returns 401 (human + agent)
- [x] Signed in, asking a question produces a card that reaches `ready` with picture and audio; live status is visible (human)
- [x] The paragraph is a single paragraph within the word limit, for each age band (agent: 51-77 words on live cards, all within limits)
- [x] A follow-up chip creates a linked card, and the trail shows the chain (human; first attempt found the writer bug, fixed)
- [x] Asking the same question again reuses the card instantly and doesn't count toward the cap (human + agent)
- [x] "Why is it cold in winter?" gets a correct answer (tilt, not distance) and the Checked badge (human)
- [ ] A sensitive question gets a gentle answer; an unsafe one gets the grown-up redirect; a question with personal details is never public (gentle + personal: human, pass on iPhone; unsafe: still to run)
- [x] The daily cap is enforced server-side (calling the API directly is still blocked) (agent: 429 in prod logs, owl-nap copy shown)
- [x] No secrets in the repo (`git grep` sweep); `reference/` is gitignored (agent)
- [x] Works at phone width (human, iPhone)

## Log
| When | Milestone | What was verified | How | Who (agent/human) | Result | Notes |
|---|---|---|---|---|---|---|
| 2026-10-03 | Setup | First deploy serves 200; app source is GitHub `hchitte2/kurious` | `curl -sI`, `deepspace app source` | agent | pass | First deploy attempt hit a transient `fetch failed`; retry succeeded |
| 2026-10-03 | Setup | `reference/` and the secret-file patterns are gitignored | `git check-ignore -v` | agent | pass | Reference apps had been committed as gitlinks; untracked |
| 2026-10-03 | Block 1 | Contract + fixtures type-check; every status covered; fixture paragraphs within word limits | `tsc --noEmit`, a tsx script | agent | pass | |
| 2026-10-03 | Kit | Secrets guard blocks secret-file reads and forbidden deepspace verbs; allows git push and deploy | 11 piped cases + one live blocked read | agent | pass | |
| 2026-10-03 | Blocks 2-4 (dev) | Signed-in ask -> ready with picture + narration (35 s); follow-up chip -> linked card with trail (25 s); winter answer = tilt, not distance | `tests/live-card.spec.ts` (LIVE_CARD=1), real calls | agent | partial | No card got the badge: checker failed true cards on 1-2 extra words -> length moved into code |
| 2026-10-03 | Review | Paid paths gated + capped; no client card writes; public routes leak nothing but... | `code-reviewer` subagent | agent | 1 blocker | Private parent question leaked via a public card's trail -> public routes drop the trail; 4 should-fixes applied |
| 2026-10-03 | Deploy (prod) | `/` 200; signed-out POST /api/ask 401; /api/wall 200; unknown card 404; file listing 401; direct owner-billed integration 401; no error logs | `curl`, `deepspace logs` | agent | pass | release rel_01M41YETZK8B853WBJ4W9XG3YT |
| 2026-10-03 | Prod live | One card per age band reaches ready (19-28 s) with picture + audio; winter card Checked; same question again reused in 0 s, free | `tests/live-prod.spec.ts` (LIVE_PROD=1) | agent | pass | Cats/moon cards were true but lost the badge on sentence length -> length no longer decides the badge |
| 2026-10-03 | Kid content | 6 real cards reviewed for truth, misconceptions, age fit, follow-ups | `kid-content-reviewer` subagent | agent | 6x fix, 0 pull | Drove prompt edits: early hedges, name both causes, comparisons true when tried, tilt-rocking misconception, checker sees follow-ups + image prompt |
| 2026-10-03 | Tests | Smoke + API suite: Ask, sign-in gate, Wall, every card state from fixtures, 401s, Wall payload has only CardView fields, file listing blocked, forged token 401 | `npx deepspace test run all` | agent | 33 pass, 4 skip | Skips: empty dev Wall, 2nd test account, 2 paid opt-in specs. Found the `/home` sign-in redirect bug -> fixed |
| 2026-10-03 | Deploy (prod) | OAuth completion lands on `/`; Wall shows the Checked card with an empty trail and only CardView keys | `curl` | agent | pass | release rel_01M41Z8ZWNT1RNCYRWXCFH2WHP (deploy needed 3 retries of a transient `fetch failed`) |
| 2026-10-03 | Prod live (new prompts) | Leaves (6-8): Checked in 20 s. Moon (9-11): checker (GPT-6) caught a wrong ball-and-lamp demo in the paragraph and image prompt after one rewrite -> no badge, off the Wall | `live-prod.spec.ts` single-card mode + `deepspace logs --search check` | agent | pass | The cross-provider check catching a real error in the writer's (Claude's) card |
| 2026-10-03 | Ship | No secret patterns (API keys, JWTs, GitHub tokens, private keys) in tracked files; no tracked secret files; `reference/` untracked | `git grep` sweep | agent | pass | |
| 2026-10-03 | Agent tools (prod) | `agent tools kurious` lists wall_list, card_get, my_cards, usage_today; `usage_today` and `wall_list` return live data | `npx deepspace agent tools/invoke` | agent | pass | Read-only, free; identity from the verified agent token |
| 2026-10-03 | Daily cap (prod) | Test account's 6th card that day refused: POST /api/ask 429, UI shows the "owl nap" copy | live spec + `deepspace logs` | agent | pass | Found by accident while verifying knowledge |
| 2026-10-03 | Managed knowledge (prod) | 26 misconception cards seeded on first card; after moving the lookup alongside safety (12 s timeout), "Why do camels have humps?" retrieved `camel-humps@1.00` and the card opens "A camel's hump isn't full of water, it's full of fat." (Checked, 20 s) | live spec + `deepspace logs --search make-card` | agent | pass | First two searches timed out at 4 s (failed open, cards still made) -> fixed |
| 2026-10-04 | Human run (follow-up step) | A follow-up card ("How do scientists predict when a volcano will erupt?") failed with "Oops", also on Retry | human found; agent traced via `deepspace logs` | human + agent | fail -> fixed | Writer thinking used the whole 1200-token budget (finishReason=length, 1199 reasoning tokens). Fixed (low-effort thinking, 6000 tokens); same question then ready + Checked in 21 s |
| 2026-10-04 | Human run (phone) | iPhone, second account: gentle + personal question ("Why did my friend Maya's dog die?") -> kind short answer, grown-up nudge, no share button; audio plays; no sideways scroll | phone screenshots; `curl /api/wall` (Maya card absent) | human + agent | pass | |
| 2026-10-04 | Human run (phone) | Fonts fell back to system fonts in production | human spotted; agent: font files 404 (`/assets/files/*.woff2`) | human + agent | fail -> fixed | Tailwind PostCSS inlined @fontsource @imports without rebasing url()s; fonts now imported from JS; prod serves font/woff2 200. Also deduped the Wall (same question twice) |

## Human interventions
Every time you overrode, corrected or took over from the agent.
| When | What the agent did or proposed | What I changed, and why |
|---|---|---|
| Planning | Proposed multi-page explainers | Changed to one picture + one paragraph per card |
| Planning | Proposed continuous verification per milestone | Batched into an end-of-day pass to ship in one day |
| 2026-10-03 setup | Recommended ElevenLabs narration (S1) and flagged the $5 free-plan budget | Switched to the cheapest narration (OpenAI tts-1) to get it done |
| 2026-10-03 setup | Found the kit's hooks, agents and kid-content skills missing and asked | Told the agent to write them |
| 2026-10-04 checklist | Reported the app as done and verified | Found a follow-up card failing ("Oops", also on Retry) -> agent traced it to the writer's token budget and fixed it |
| 2026-10-04 checklist | Fixture screenshots looked on-brand | On my iPhone the fonts were system fonts -> agent found the font files 404'd in production and fixed the build |
