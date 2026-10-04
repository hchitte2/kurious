# Submission note

**Live URL:** https://kurious.app.space
**Repository:** https://github.com/hchitte2/kurious

## Trying it (for reviewers)
- Browse the Wonder Wall and open any card without signing in; tap the play button to hear it.
- Sign in to ask your own question. The app is owner-billed on DeepSpace's free plan, so new
  cards are capped at 5 per person and 8 per day across the app; Kuri says it "needs an owl nap"
  when a cap is hit. Asking a question that has already been answered is instant and free.
- Add `?fixtures` to any URL (e.g. https://kurious.app.space/c/fx-sun-night?fixtures) to see
  every card state, including generating, declined and error, without spending anything.

## What I built
Kurious answers a kid's "why?" with one illustrated, narrated paragraph, written for their age
(4-5, 6-8 or 9-11) and checked for truth by a second AI from a different company. Every card
ends with 2-3 "But why?" follow-ups, so one question turns into a trail of discovery. Cards that
pass every check land on a public Wonder Wall.

## DeepSpace integrations I used, and why
- **Auth + records + real-time sync:** grown-ups sign in; each card is a record the worker writes
  stage by stage, and the card page subscribes to it, so the paragraph appears the moment it's
  written, the picture paints in, and the play button wakes up when the narration lands.
- **RBAC:** clients can only read their own `cards` and can never write them; `usage` (the daily
  caps) is server-only. Only the worker writes cards, so nobody can forge a "Checked" card onto
  the Wall.
- **Background jobs:** one job per card, in its own job room (a shared room runs one job at a
  time). It survives the tab closing; every stage writes the record.
- **AI with two providers:** writer = Claude Sonnet 5, safety = Claude Haiku 4.5, checker =
  GPT-6 Sol. Roles live in one config file; swapping a provider is a one-line change.
- **Integrations proxy:** Gemini image generation for the picture, OpenAI TTS for narration,
  owner-billed.
- **File storage:** pictures and narration go to app-scope storage; the card stores a same-origin
  URL that loads signed-out and supports Range requests (iOS audio).
- **Managed knowledge:** 26 misconception cards (seasons, moon phases, "bats are blind", ...)
  live in the app's knowledge base, seeded automatically. Before writing, the job retrieves the
  closest ones and gives them to the writer (avoid these) and the checker (hunt for these). It
  fails open, so a knowledge outage never blocks a card.
- **Local agent tools:** `npx deepspace agent tools kurious` exposes four free, read-only tools
  (`wall_list`, `card_get`, `my_cards`, `usage_today`) so a local assistant can inspect the live
  app; used for verification. No tool can trigger a paid card.
- **Testing:** `deepspace/testing` test accounts drive 33 Playwright smoke/API tests (plus 14 unit
  tests) and opt-in paid live tests, locally and against production.

## What I left out, and why
| Left out | Why |
|---|---|
| Multi-page books | One true paragraph is the product: faster, cheaper, and each answer is checkable. |
| Payments | An evaluation build: owner-billed with per-user and global daily caps instead. |
| Kid accounts | Grown-ups own the account; no kid personal data is collected. |
| Web search | Unvetted web text is a worse grounding source for a 5-year-old than a careful writer plus an independent checker. |
| Semantic (near-duplicate) reuse | Near-duplicate questions can need different answers ("why is the sky blue" vs "why is the sky red at sunset"); only exact-match reuse ships. |
| Constellation map of trails, voice input (P2) | Time. |

## The main tradeoff
**Correctness over speed.** A second-provider check (plus at most one rewrite) adds seconds to
every card, because a 5-year-old can't spot a wrong answer. Cards that fail the check still reach
the child who asked, but without the badge and never on the public Wall. It pays off: on
production, GPT-6 caught Claude's moon-phases card suggesting a "walk around the lamp holding a
ball" demo (wrong: you stand still and turn) in both the paragraph and the picture prompt, so
that card got no badge and stayed off the Wall. One lesson from the first live run: the checker
was failing true cards over a single extra word, so length moved into code (it can trigger the
one rewrite) and only the truth verdict decides the badge.

Measured: a new card is ready in about 20-35 s (paragraph in a few seconds, picture and
narration after) and costs about $0.20 of credits; a reused card is instant and free.

## What the agent did
Claude Code ran the whole build from a one-day plan with parallel subagents and a
contract-first split (shared `src/shared/card.ts` + fixtures before any track started):
registration, the first deploy (claiming GitHub as source of truth), four research spikes
(image/TTS, providers + structured output, background jobs, file storage), the worker pipeline,
every screen, a code review (one blocker found and fixed: a private parent's question leaking
through a public card's trail), a kid-content review of real cards (which tightened the writer
and checker prompts), smoke tests, and live end-to-end runs on dev and production. After I asked
whether every DeepSpace primitive was in use, it added managed knowledge and local agent tools.
See `docs/VERIFICATION.md` for the log and `docs/PLAN.md` for decisions.

## What I verified or changed myself
- Chose the cheapest narration (OpenAI tts-1) to stay inside the free plan's $5 of credits, and
  asked the agent to write the missing kit (hooks, subagents, kid-content skills).
- Ran the critical-path checklist on the live app (laptop + iPhone): signed-out browsing and
  sign-in gate, instant free reuse of "Why is it cold in winter?" (tilt, Checked), a new card
  building live, follow-up trails, a gentle + personal question kept off the Wall, an unsafe
  question ("why dows mu tummy hurt every day?", typos and all) getting the grown-up redirect,
  audio and layout on a phone.
- Asked whether the app used every DeepSpace primitive in the plan; it didn't yet, so managed
  knowledge (misconception retrieval) and local agent tools were added and verified live.
- Found two real bugs the agent's tests missed, both fixed the same day:
  - A hard follow-up ("How do scientists predict when a volcano will erupt?") always failed:
    the writer model spent its whole token budget thinking (1199 of 1200 tokens).
  - On my phone the app showed system fonts: the font files 404'd in production builds only.

## What I'd do next
- Top up credits and raise the daily caps (5 per user, 8 app-wide) in `src/config.ts`.
- A friendly "Kuri is resting" message when the owner's credits run out (today that shows the
  generic error screen).
- Tune the knowledge relevance cutoff (`minScore` in `src/config.ts`) from logged scores.
- Return a user's existing copy on repeat reuse instead of creating a new record each time.
- A server-side retry-in-flight marker, so two simultaneous Retries can't both run.
