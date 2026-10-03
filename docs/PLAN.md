# Kurious: Plan (one-day build)

> A kid asks "why?". Kurious answers with one picture, one short paragraph read aloud, and
> 2-3 "But why?" buttons to keep exploring.

This is a living doc. Fill in "Spike findings" and add to "Decisions log" as we go.

---

## 0. Priorities
1. Ship the core flow on kurious.app.space **today**.
2. UI/UX: delightful, intuitive, kid-first (docs/DESIGN.md).
3. Kid content is true (the `kid-explainer-style` skill).

Verification and basic tests happen in **Block 6**.

## 1. Feature tiers

**P0: must ship**
- **Ask screen:**
  - big input
  - suggestion bubbles
  - age band: Little 4-5 (the default), Kid 6-8, Big kid 9-11
- **The card:**
  - one picture, ONE paragraph, narration, and 2-3 "But why?" follow-up chips
  - **progressive reveal**: the paragraph appears as soon as it's written, the picture paints
    in afterwards, and the play button wakes up when the audio is ready
- **Follow-up chain:** tapping a chip creates a linked card; a breadcrumb trail shows the path.
- **Wonder Wall:** a public gallery plus shareable card links.
- **Guardrails:**
  - sign-in gate and a per-user daily cap
  - a safety gate: one cheap classification call that returns
    `{label: ok | gentle | decline, personal}`

**P1: the differentiator vs StoryNest (ship in Block 4)**
- **Checker:** a model from a *different provider* checks the paragraph for truth and age fit.
  On failure it gets one rewrite, then a re-check. Passing cards get a "Checked" badge with a
  tooltip for grown-ups.
- **Instant answers:** an exact normalized match on the question and age band reuses the
  existing card. Reused cards are free and don't count toward the cap.
- **My questions (`/me`):** past trails.

**P2: only after a solid deploy**
1. About 25 misconception cards in managed knowledge, retrieved for the writer and the checker
   (`misconception-cards` skill), plus semantic reuse.
2. A constellation map of trails.
3. Voice input through the Web Speech API.
4. `/bench`, a model comparison page.

**Non-goals (for the writeup)**

| Left out | Why |
|---|---|
| Multi-page books | One true paragraph is the product. Books are slower, costlier and riskier, and StoryNest already does them. |
| Payments | This is an evaluation build; it's owner-billed with daily caps instead. |
| Kid accounts | Grown-ups own the account, so no kid personal data is collected. |
| Web search (Exa/Tavily) | Unvetted web text is a worse grounding source for 5-year-olds than curated cards. |
| Languages, read-along highlighting, voice rooms, OAuth, chat | Not on the important path. |

---

## 2. Architecture

### Pipeline: one background job per card
```
POST /api/ask {question, ageBand, parentCardId?}
  -> sign-in check -> daily cap -> normalize
  -> [P1] exact-match reuse -> return the existing cardId
  -> create card {status: queued} -> start the job -> return cardId

job(cardId):
  1. safety      safety role -> decline? status=declined (grown-up message) and stop
  2. write       writer role, generateObject -> {paragraph, keyIdea, followUps[2..3], imagePrompt}
                 -> save the paragraph + follow-ups now (progressive reveal), status=illustrating
  3. [P1] check  checker role (other provider) -> pass | fail(issues)
                 fail -> one rewrite -> re-check -> still failing: no badge, never public
  4. illustrate + narrate IN PARALLEL -> app file storage -> save the URLs as each one finishes
  5. ready
```
- **Why a background job:** the image and audio take tens of seconds, the job survives the
  page closing, and every status change syncs to the UI in real time.
- **Fallback:** if wiring the background job eats more than an hour, run the same stages from
  the ask route and keep updating the record. Log the decision.

### Model roles (`src/config.ts`)
| Role | Default |
|---|---|
| writer | `claude-sonnet-5` |
| checker | a GPT-5.6 model (pick it in spike S2) |
| safety | `claude-haiku-4-5` |

Changing a role's provider is a config change, which is the provider portability story for
the writeup.

### Data (finalize against the docs)
- **cards:**
  - ownerId, question, normalizedQuestion, ageBand
  - status: `queued` | `writing` | `checking` | `illustrating` | `ready` | `declined` | `error`
  - paragraph, keyIdea, followUps[], imagePrompt, imageUrl, audioUrl
  - parentCardId, rootCardId
  - safety {label, personal}
  - check {verdict, issues[], checkerModel, rewrites}
  - writerModel, isPublic, errorMessage, createdAt
- **usage:** ownerId, day, count. Server-only.

### Permissions intent
- Clients never create or update `cards` (the same pattern as the SDK's `ai-messages`).
- Owners read their own cards.
- The Wall shows only cards that are `isPublic && ready && verdict pass && !personal`. Use RBAC
  if it can express that; otherwise serve the Wall through a worker route that filters.

### Pages
| Route | Purpose |
|---|---|
| `/` | Ask: input, suggestion bubbles, age band, mascot, a strip of the latest Wall cards |
| `/c/:id` | Card: generating and ready states, trail breadcrumb, follow-ups, "ask something new" |
| `/wall` | Wonder Wall (public) |
| `/me` | My questions (P1) |

---

## 3. One-day build plan

### Rules for parallel work
- **Contract first.** The main agent writes `src/shared/card.ts` and `src/fixtures/cards.ts`
  (sample cards in every status, including generating states) before the tracks start.
- **File ownership** is listed in CLAUDE.md. `pipeline-builder` and `ui-builder` run in
  parallel and never edit each other's files.
- **The UI is built against fixtures first,** then switched to `useQuery` in Block 3.
- **Commit at the end of every block.** Run `/compact` (or start a fresh session) at block
  boundaries; todo.md and lessons.md carry the state.

### Blocks (rough hours; keep moving)
| Block | Time | Main agent | Parallel subagents | Human |
|---|---|---|---|---|
| 0. Setup | 0:00-0:45 | Merge the kit with the scaffold; confirm the CLI commands | none | Setup steps, including the first deploy. Screen designs in parallel. |
| 1. Spikes + contract | 0:45-1:45 | Contract + fixtures + `src/config.ts` (the scaffold is already deployed during setup) | 4x `docs-researcher` / spikes: S1 image + TTS endpoints and cost (read storynest); S2 both providers + `generateObject`; S4 background jobs (read threadhunt); S5 file storage + public URLs | Drop design PNGs into docs/design/ |
| 2. Build | 1:45-5:00 | Unblock, answer contract questions | `pipeline-builder`: P0 pipeline. `ui-builder`: design tokens, Ask, Card (every state), Trail, Wall from fixtures | Eyeball the UI on the dev server and leave quick notes |
| 3. Integrate ★ | 5:00-6:00 | Wire the UI to real records; follow-ups end to end; Wall route; **deploy** | none | Try it on a phone and a tablet |
| 4. P1 + polish ★ | 6:00-8:00 | Merge, deploy | `pipeline-builder`: checker + badge data, exact reuse. `ui-builder`: badge, `/me`, motion, empty/error states, responsive | UI feedback |
| 5. P2 or polish | 8:00-9:00 | Pick from P2 in order, or more polish | as needed | none |
| 6. Verify + test + ship ★ | 9:00-10:30 | Fix what's found; final deploy; README; SUBMISSION | `code-reviewer`; `kid-content-reviewer` on 5 real cards; a test writer for basic Playwright smoke tests (`deepspace/testing`) | Run the critical-path checklist in docs/VERIFICATION.md |

### Spikes (Block 1); write the findings below
- **S1:** the image and TTS integration endpoints, their schemas, cost and latency, and how
  storynest stores the outputs.
- **S2:** `createDeepSpaceAI` for Anthropic and OpenAI from the worker, owner-billed;
  `generateObject` with Zod on both; pick the checker model.
- **S4:** the background job lifecycle, its limits, and how to report progress.
- **S5:** saving a binary to app storage and getting a URL that loads on the public Wall.

### Spike findings
_(fill in)_

### Decisions log
| Decision | Why |
|---|---|
| One paragraph per card, not pages | Human call: focused, fast, cheap, checkable |
| Owner-billed + daily cap | Reviewers have no credits |
| Checker on a different provider than the writer | Independent errors; provider portability |
| Mascot is a static SVG, never generated | Image models can't keep a character consistent |
| Cards written only by the worker | Nobody can forge a "Checked" card onto the Wall |
| Verification batched into Block 6 | Human call: speed today; still verified before submitting |

---

## 4. Setup (the human, before Block 0)
Follow the step-by-step setup from the planning chat. It covers prerequisites, DeepSpace
login, scaffolding, copying this kit in, creating the GitHub repo, pushing, and running the
first dev server and the first deploy.

The GitHub remote must exist before the first deploy, because that deploy permanently makes
GitHub this app's source of truth. The first deploy is done by hand during setup, so Block 1
doesn't deploy the bare scaffold.
