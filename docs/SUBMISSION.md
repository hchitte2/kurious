# Submission note (draft; paste into the portal)

**Live URL:** https://kurious.app.space
**Repository:** <link>

## What I built
Kurious answers a kid's "why?" with one illustrated, narrated paragraph, written for their age
and checked for the classic misconceptions kids' explanations get wrong. Every card ends with
"But why?" follow-ups, so one question turns into a trail of discovery.

## DeepSpace integrations I used, and why
- Auth + records + real-time sync: <...>
- Background jobs: <...>
- AI with two providers (writer and checker on different providers): <...>
- Managed knowledge (misconception retrieval + duplicate-question reuse): <...>
- Integrations proxy (image + text-to-speech): <...>
- File storage: <...>
- Local agent tools (used for verification): <...>

## What I left out, and why
<Pull this from the non-goals table in docs/PLAN.md: payments, kid accounts, web search, books,
OAuth, and so on.>

## The main tradeoff
<Pick one and own it. Candidates:
 (a) Correctness over speed: a second-provider check adds about N seconds per card, because a
     5-year-old can't spot a wrong answer.
 (b) One card, not a book: less rich, but faster, cheaper, and each answer is checkable.
 (c) Owner-billed with daily caps, so reviewers can use the app, which means I carry the spend
     risk.>

## What the agent did
<Summarize from git history + docs/VERIFICATION.md: scaffolding, pipeline stages, UI, and so on.>

## What I verified or changed myself
<From the critical-path checklist + the Human interventions table. Be specific.>

## What I'd do next
<Unfinished edges, honestly.>
