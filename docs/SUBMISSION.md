# Submission note

**Live URL:** https://kurious.app.space
**Repository:** https://github.com/hchitte2/kurious

## What I built
Kurious answers a kid's "why?" with one illustrated, narrated paragraph, written for their age
(4-5, 6-8 or 9-11) and checked for truth by a second AI from a different company. Every card
ends with 2-3 "But why?" follow-ups, so one question turns into a trail of discovery. Cards that
pass every check land on a public Wonder Wall.

## DeepSpace integrations I used, and why
- **Auth + records + real-time sync:** grown-ups sign in; each card is a record the worker writes
  stage by stage, and the card page subscribes to it, so the paragraph appears the moment it's
  written, the picture paints in, and the play button wakes up when the narration lands.
- **RBAC:** `cards` and `usage` are read-own / no client writes. Only the worker writes cards, so
  nobody can forge a "Checked" card onto the Wall.
- **Background jobs:** one job per card, in its own job room (a shared room runs one job at a
  time). It survives the tab closing; every stage writes the record.
- **AI with two providers:** writer = Claude Sonnet 5, safety = Claude Haiku 4.5, checker =
  GPT-6 Sol. Roles live in one config file; swapping a provider is a one-line change.
- **Integrations proxy:** Gemini image generation for the picture, OpenAI TTS for narration,
  owner-billed.
- **File storage:** pictures and narration go to app-scope storage; the card stores a same-origin
  URL that loads signed-out and supports Range requests (iOS audio).
- **Testing:** `deepspace/testing` test accounts drive Playwright smoke tests and an opt-in paid
  live test, locally and against production.

## What I left out, and why
| Left out | Why |
|---|---|
| Multi-page books | One true paragraph is the product: faster, cheaper, and each answer is checkable. |
| Payments | An evaluation build: owner-billed with per-user and global daily caps instead. |
| Kid accounts | Grown-ups own the account; no kid personal data is collected. |
| Web search | Unvetted web text is a worse grounding source for a 5-year-old than a careful writer plus an independent checker. |
| Misconception cards in managed knowledge, constellation map, voice input (P2) | Time: the misconception list is built into the writer and checker prompts instead. |

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
through a public card's trail), smoke tests, and live end-to-end runs on dev and production.
See `docs/VERIFICATION.md` for the log and `docs/PLAN.md` for decisions.

## What I verified or changed myself
- Chose the cheapest narration (OpenAI tts-1) to stay inside the free plan's $5 of credits.
- Asked the agent to write the missing kit (hooks, subagents, kid-content skills).
- Critical-path checklist on the deployed app: see `docs/VERIFICATION.md`.

## What I'd do next
- Top up credits and raise the daily caps (5 per user, 12 global) in `src/config.ts`.
- Misconception cards in managed knowledge with retrieval for the writer and checker.
- Return a user's existing copy on repeat reuse instead of creating a new record each time.
- A server-side retry-in-flight marker, so two simultaneous Retries can't both run.
