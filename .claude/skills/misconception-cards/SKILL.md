---
name: misconception-cards
description: Use when writing or loading the P2 misconception cards into DeepSpace managed knowledge, or when wiring their retrieval into the Kurious writer/checker prompts.
---

# Misconception cards (P2)

About 25 short cards, each covering one classic misconception kids (and their explainers)
fall for. They're stored in DeepSpace managed knowledge and retrieved by question similarity,
then passed to the **writer** (avoid this) and the **checker** (hunt for this).

Look up the knowledge API in the docs before using it (`knowledge` from `deepspace/worker`;
docs: /guides/knowledge). Never guess signatures.

## One card
```md
# <topic>: <the misconception in a kid's words>
- **Wrong:** <the misconception, one sentence>
- **Right:** <the truth, one sentence a 6-year-old could follow>
- **Why kids think it:** <the intuition behind it>
- **Say instead:** <a 1-2 sentence kid-ready explanation>
- **Triggers:** <comma-separated question phrasings that should retrieve this card>
```

## Starter list
Seasons (distance vs tilt), sky color (ocean reflection vs scattering), moon phases (shadow vs
sunlit half), falling objects (heavy vs together), plant food (soil vs photosynthesis), blood
color, bats blind, goldfish memory, 10% brain, lightning twice, camel humps, ostrich heads,
paint vs light mixing, sun is yellow (it's white), stars twinkle themselves (air), rain from
clouds "bumping", sweating "cools by water being cold", hot air "rises because it's light"
(it's pushed up), sound in space, the tongue taste map, cracking knuckles causes arthritis,
summer = Earth closest, dinosaurs and humans together, all bacteria are bad, chameleons change
color to match backgrounds.

## Rules
- Every card follows the `kid-explainer-style` skill's truth rules.
- Retrieval is additive context, never a replacement for the checker.
- Keep each card under ~120 words so several fit in a prompt.
