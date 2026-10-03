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
  2. write       writer role, generateText + Output.object -> {paragraph, keyIdea, followUps[2..3], imagePrompt}
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
| checker | `gpt-6-sol` (S2: GPT-5.6 is legacy now) |
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
Researched 2026-10-03 against deepspace 0.34.0 / ai 7.0.107 / zod 4. Paths are into
`node_modules/deepspace/dist/` unless noted. No paid calls were made.

**S1: picture + narration (integrations)**
- Call from the worker with `tools.integration<T>(endpoint, body)` (worker.d.ts:3141). On success,
  `result.data` is the body itself. In our scaffold, `createActionTools` is private in
  `src/server/action-routes.ts:65`; pipeline-builder exports it (storynest:
  `createActionTools(env, userId, env.APP_OWNER_JWT)`, storybookJob.ts:69).
- **Picture:** `gemini/generate-image`, model `gemini-2.5-flash-image`, `aspectRatio: '4:3'`
  (`imageSize` 1K only). Returns `{ base64Images: string[] }` (data URIs). If the content filter
  blocks it, the array comes back empty. Treat that as an error and say "no text, no letters" in
  the prompt. Fallback: `openai/generate-image` (`gpt-image-1-mini`, 1536x1024, quality low).
- **Narration:** `elevenlabs/generate-speech`, `model_id: eleven_flash_v2_5`,
  `output_format: mp3_44100_64`. Returns `{ audioUrl }` as a data URL. Voice
  `JBFqnCBsd6RMkjVDRZzb` ("George") is unconfirmed; check it once with `elevenlabs/list-voices`
  ($0.004). Fallback: `speech/text-to-speech` (OpenAI `tts-1`, about 10x cheaper).
- **Cost:** the platform charges 1.3x the provider price.
  - Paid plan: image about $0.05, TTS about $0.026 per card.
  - **Free plan:** image about $0.155, TTS about $0.08 per card.
  - The account is on the **free plan with 500 credits ($5), so about 20 cards in total.**
  - Latency hasn't been measured. Typical figures: image 5-15 s, TTS 1-3 s.
- No hosted URLs come back, so nothing expires. Everything must go to file storage, and a data
  URI is never stored on the card. Wrap calls in per-stage retries (storynest
  `withRetry.ts:24-46`: 3 tries, no retry on quota or forbidden errors).

**S2: AI providers + structured output**
- **Signature:** `createDeepSpaceAI(env, 'anthropic' | 'openai' | 'cerebras', { authToken? })`
  returns `(modelId) => LanguageModel` (worker.d.ts:3422). **Owner-billed means no
  `authToken`**: it falls back to `env.APP_OWNER_JWT`. (`billing: 'developer'` in
  `src/integrations.ts` is only for the integrations proxy.) Owner-billed calls accept any caller,
  so **our sign-in check and cap are the only gate**.
- **AI SDK 7:** `generateObject` is deprecated. Use
  `generateText({ model, instructions, prompt, output: Output.object({ schema }), maxOutputTokens })`
  and read `.output`. This was type-checked against the installed types.
- **Model ids** (catalog is `DEEPSPACE_AI_MODELS`, dated 2026-09-24; config.ts type-checks
  against it):
  - writer `claude-sonnet-5`
  - safety `claude-haiku-4-5`
  - checker **`gpt-6-sol`**: the `gpt-5.6-*` ids are now `legacy`, and `gpt-6-luna` is the cheap
    fallback.
- **Schema rules:**
  - OpenAI runs strict json_schema, so use `.nullable()` and never `.optional()` or `.default()`
    (strict mode rejects those with a 400).
  - Anthropic turns `max` / `maxItems` into hints only. Use `.min(2)` and trim follow-ups to 3 in
    code.
  - If the first Anthropic call fails on structured output, set
    `providerOptions.anthropic.structuredOutputMode: 'jsonTool'`.
- **Parameters:**
  - Sonnet 5 and GPT-6 ignore temperature. GPT-6 takes `reasoningEffort: 'low'`.
  - Always set `maxOutputTokens`: Anthropic reserves credits against it (64k by default), and the
    OpenAI limit includes reasoning tokens.
- **Errors:** `NoObjectGeneratedError` and `NoOutputGeneratedError` for bad output,
  `APICallError` for HTTP failures (`statusCode === 402` means out of credits). Log with
  `deepSpaceAgentErrorSummary(err, { provider, modelId })`.

**S4: background jobs**
- **Already wired.** `AppJobRoom extends JobRoom` -> `runJob` in `src/jobs.ts` (worker.ts:69-83,
  binding `JOB_ROOMS`).
- **Start a job** from the ask route with
  `enqueueJob(env.JOB_ROOMS, \`card:${cardId}\`, 'make-card', { cardId }, { maxAttempts: 1, enqueuedBy })`
  (worker.d.ts:1729). The payload is just `{cardId}`.
- **One job runs at a time per room, so use one room per card.** A shared room would queue cards
  behind each other.
- **Timing and failures:**
  - Each run gets 15 minutes of wall time.
  - A throw marks the *job* as failed but leaves the *card* untouched. Catch errors and write
    `status: 'error'` yourself.
  - Use `maxAttempts: 1` plus per-stage retries, because a whole-job retry pays for the LLM again.
  - Guard on `status === 'queued'`, and skip any stage whose output is already saved.
  - A crashed job only releases after about 16 minutes, so the UI treats a card still generating
    after 3 minutes as stale (`isStale` in the contract).
  - Pass `AbortSignal.any([ctx.signal, AbortSignal.timeout(STAGE_TIMEOUT_MS)])` to every call.
- **`waitUntil` fallback ruled out:** the docs say it is killed 30 s after the response, and our
  pipeline takes 30-60 s.
- **Progress:** `buildCronContext(env, env.OWNER_USER_ID, \`app:${env.DEEPSPACE_APP_ID}\`)`, then
  `.records.update('cards', id, partial)`.
  - It writes as the app, merges the fields, and pushes the change live to every reader.
  - Always pass the room id (it defaults to `'default'`).
  - `ctx.progress` only updates the job row, not the card.
- **Schema:**
  - Set `ownerField: 'ownerId'` but **not** `userBound`, which would overwrite it with the writer
    (the app).
  - viewer and member get `read: 'own'`, with create, update and delete all false (threadhunt
    `candidates-schema.ts:7,32-38`).
- **Security hole in the scaffold:** `/ws/jobs/:roomId` (`src/server/realtime-routes.ts:169`) plus
  `authorizeWrite` (worker.ts:72-75) let any member enqueue jobs directly, which bypasses the cap.
  Make that path admin-only. `enqueueJob` goes through the internal path and is unaffected.

**S5: file storage + public URLs**
- No upload helper is exported. POST through `platformWorkerFetch` to
  `https://internal/internal/files/upload?scope=app&key=cards/<cardId>/image.png`.
  - Headers: `x-user-id`, plus `x-app-identity-token` and `x-app-id` when `APP_IDENTITY_TOKEN` is
    set.
  - Body: `{ data: base64, name, mimeType }`. It returns `{ success, key }`.
  - Reference: worker.js:6862-6930. The full helper is in the S5 report.
- **Store `/api/files/<returned key>?scope=app` on the card.** Tested live, signed out:
  - plain GET -> 200 `audio/mpeg`
  - `Range` -> 206 (iOS audio works)
  - `If-None-Match` -> 304
  - no token, no expiry
  - Leaving out `?scope=app` returns 401; hand-building the key returns 403. Always use the
    returned key.
- **Keys:** use fixed keys per card (`cards/<id>/image.png`, `cards/<id>/narration.mp3`) so a
  retry overwrites the same file. Ignore the response's `url` field (its origin is
  `https://internal`).
- **MIME types:** always pass one. SVG, HTML and JS are refused.
- **Gotchas:**
  - **App scope is listable while signed out** (`GET /api/files?scope=app`). Block the bare listing
    in our proxy (`src/server/http-routes.ts:281`).
  - **Storynest's pattern is broken for us:** it uses self scope, and its featured-story route
    drops `Range`. Don't copy it.
- **Limits:**
  - About 18.75 MiB per base64 upload.
  - 1 GiB of storage shared across the owner's apps; going over returns 409
    `storage_quota_exceeded`.
  - Nothing is cleaned up automatically; to delete a file, send `DELETE /internal/files/<key>`.
- **Dev:** uploads need `APP_IDENTITY_TOKEN`, which may only exist after the first deploy (done).
  Dev writes probably land in the live bucket.

### Decisions log
| Decision | Why |
|---|---|
| One paragraph per card, not pages | Human call: focused, fast, cheap, checkable |
| Owner-billed + daily cap | Reviewers have no credits |
| Checker on a different provider than the writer | Independent errors; provider portability |
| Mascot is a static SVG, never generated | Image models can't keep a character consistent |
| Cards written only by the worker | Nobody can forge a "Checked" card onto the Wall |
| Verification batched into Block 6 | Human call: speed today; still verified before submitting |
| GitHub `hchitte2/kurious` is the app's source (latched on the first deploy, 2026-10-03) | Setup plan; DeepSpace source verbs now refuse |
| `reference/` untracked and gitignored, plus `.env*` and `.DS_Store` | The reference apps were committed as dangling gitlinks; they stay local-only and read-only |
| Checker is `gpt-6-sol`, not GPT-5.6 | S2: the `gpt-5.6-*` ids are now legacy in the SDK catalog |
| `generateText` + `Output.object`, not `generateObject` | S2: `generateObject` is deprecated in AI SDK 7 |
| Background job, one job room per card (`card:<id>`) | S4: `waitUntil` dies 30 s after the response; a shared room runs one job at a time |
| Card records are owner-read-only; the Wall and shared cards go through worker routes returning `CardView` | S4: RBAC visibility is all-or-nothing per row, so a public row would expose `ownerId` and safety details |
| `wall: 'private' \| 'public'` text column, set once by the worker at `ready` | S4: boolean columns are stored as 0/1 and filter unreliably; one flag carries all the Wall conditions |
| Media in app-scope storage; the card stores `/api/files/<key>?scope=app` | S5: public, durable, supports Range (iOS audio); block the bare file listing in our proxy |
| `ready` needs only the paragraph; `imageUrl` / `audioUrl` may stay null if media fails | No dead ends: the kid still gets the answer. The Wall requires a picture (via `wall`) |
| Exact-match reuse copies into a new card (`reusedFromCardId`) instead of returning the old id | Owners can only read their own cards, and the trail has to stay the asker's |
| Trail ancestors denormalized onto each card (`trail: TrailStop[]`) | The breadcrumb renders from one record, with no extra queries |
| A card still generating 3 min after its last update counts as stale and gets Retry | S4: a crashed job only releases after about 16 min |
| Narration is OpenAI `tts-1` (voice `fable`), not ElevenLabs | Human call: the cheapest option, about $0.008 per card vs $0.08 |
| Length limits enforced in code with slack (+15% words, +4 words/sentence); they can trigger the one rewrite but never decide the badge. Only the checker's truth/age-fit verdict does | First live run: all 3 cards were true but failed the check on 1-2 extra words (14 vs 12 words/sentence, 56 vs 55 words), losing the badge, the Wall and free reuse |
| Caps: 5 cards per user and 12 globally per UTC day | Measured about $0.20 per card on the free plan; 440 credits left after the first live run (about 22 cards). Raise both after topping up |

---

## 4. Setup (the human, before Block 0)
Follow the step-by-step setup from the planning chat. It covers prerequisites, DeepSpace
login, scaffolding, copying this kit in, creating the GitHub repo, pushing, and running the
first dev server and the first deploy.

The GitHub remote must exist before the first deploy, because that deploy permanently makes
GitHub this app's source of truth. The first deploy is done by hand during setup, so Block 1
doesn't deploy the bare scaffold.
