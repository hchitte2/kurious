# Verification log

This log becomes the "what the agent did / what I verified" part of the submission.
Verification is batched into Block 6 (end of day). Be honest: mark who actually checked each thing.

## Critical path (the human runs these on the deployed app in Block 6)
- [ ] Signed out, a visitor can browse the Wonder Wall and open a shared card
- [ ] Signed out, a visitor cannot ask: the UI is gated and `/api/ask` returns 401
- [ ] Signed in, asking a question produces a card that reaches `ready` with picture and audio; live status is visible
- [ ] The paragraph is a single paragraph within the word limit, for each age band
- [ ] A follow-up chip creates a linked card, and the trail shows the chain
- [ ] Asking the same question again reuses the card instantly and doesn't count toward the cap
- [ ] "Why is it cold in winter?" gets a correct answer (tilt, not distance) and the Checked badge
- [ ] A sensitive question gets a gentle answer; an unsafe one gets the grown-up redirect; a question with personal details is never public
- [ ] The daily cap is enforced server-side (calling the API directly is still blocked)
- [ ] No secrets in the repo (`git grep` sweep); `reference/` is gitignored
- [ ] Works at phone width

## Log
| When | Milestone | What was verified | How | Who (agent/human) | Result | Notes |
|---|---|---|---|---|---|---|
| 2026-10-03 | Setup | First deploy serves 200; app source is GitHub `hchitte2/kurious` | `curl -sI`, `deepspace app source` | agent | pass | First deploy attempt hit a transient `fetch failed`; retry succeeded |
| 2026-10-03 | Setup | `reference/` and the secret-file patterns are gitignored | `git check-ignore -v` | agent | pass | Reference apps had been committed as gitlinks; untracked |
| 2026-10-03 | Block 1 | Contract + fixtures type-check; every status covered; fixture paragraphs within word limits | `tsc --noEmit`, a tsx script | agent | pass | |
| 2026-10-03 | Kit | Secrets guard blocks secret-file reads and forbidden deepspace verbs; allows git push and deploy | 11 piped cases + one live blocked read | agent | pass | |

## Human interventions
Every time you overrode, corrected or took over from the agent.
| When | What the agent did or proposed | What I changed, and why |
|---|---|---|
| Planning | Proposed multi-page explainers | Changed to one picture + one paragraph per card |
| Planning | Proposed continuous verification per milestone | Batched into an end-of-day pass to ship in one day |
| 2026-10-03 setup | Recommended ElevenLabs narration (S1) and flagged the $5 free-plan budget | Switched to the cheapest narration (OpenAI tts-1) to get it done |
| 2026-10-03 setup | Found the kit's hooks, agents and kid-content skills missing and asked | Told the agent to write them |
