# Lessons

Rules learned from corrections. Each one: **rule**, then why (source).
These override defaults in CLAUDE.md. Keep each rule to a line or two.

1. **A card is ONE picture and ONE paragraph. Never multiple pages.** Why: the human decided
   this in planning, for focus, speed, cost and accuracy. (source: human)
2. **Follow-up questions are a core feature, not a stretch.** Every card has 2-3, and tapping
   one creates a linked card. (source: human)
3. **Look up a DeepSpace API in the docs before using it the first time.** Why: the SDK moves
   fast (AI SDK 7 migration, model catalog changes), and guessed signatures waste a session.
   (source: planning)
4. **Speed first today: build, deploy, keep moving.** Full verification and basic tests run in
   Block 6. Exceptions that stay on: type-check, the secrets guard, and auth + caps on paid
   calls. (source: human)
5. **UI/UX is the top quality bar.** Follow docs/DESIGN.md; when unsure, choose the more
   playful, simpler, bigger option. (source: human)
6. **Take decisions to completion; don't stop for the human.** Pick the sensible option, act,
   log it in the PLAN decisions log, report after. Hard rails (secrets, undeploy/transfer)
   still hold. (source: human)
7. **`deploy_request_failed` ("fetch failed") with no action is transient on this platform.**
   Nothing lands; retry the deploy (it has cleared within 1-3 retries every time). (source:
   observed 3x today)
