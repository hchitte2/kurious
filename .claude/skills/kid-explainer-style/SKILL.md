---
name: kid-explainer-style
description: Use for any Kurious prompt or content work - writer/checker/safety prompts, fixture paragraphs, follow-up questions, image prompts, or reviewing a card. Defines how a true, age-fit, one-paragraph answer to a kid's "why?" is written and checked.
---

# Kid explainer style

A Kurious card answers ONE "why?" with ONE paragraph a grown-up would be glad their kid heard.
**True beats cute.** A simplification may leave things out; it may never say something false.

## The paragraph
1. **Open with the answer**, not a preamble. No "Great question!", no "Have you ever wondered".
2. **One idea.** The keyIdea is one sentence; every sentence in the paragraph serves it. If
   two causes are about equally big (seasons: slanted light AND short days), name both.
3. **Mechanism over label.** "Air bounces blue light around more than other colors" beats
   "because of Rayleigh scattering". Big kids (9-11) may get the real term, explained in place.
4. **One concrete comparison** to something the kid has touched or seen (a spinning top, soda
   fizz, a slide). The comparison must match the mechanism, not just the vibe, and everything
   said about the comparison object must be true when a child tries it (a flashlight spot is
   not warm).
5. **Honest uncertainty.** If scientists aren't sure, say so before or inside the first
   sentence that gives the idea ("Scientists think..."); a hedge only at the end doesn't count.
   Describe which part moves or vibrates only as precisely as you're sure of.
6. **Second person, warm, plain.** Short sentences. Words a kid says out loud.
7. **End on wonder or a link to the follow-ups**, not a moral or a quiz.
8. **Length and sentence limits per age band** live in `src/config.ts` (`AGE_BAND_WRITING`):
   little 35-55 words, max 12 words/sentence; kid 45-75 / 16; big 60-95 / 22.

## Never
- Teleology or wishes as causes: "the plant wants sun", "the bird knows to fly south" (say
  what actually happens).
- "Magic", "just because", "nobody knows" when somebody does.
- Classic misconceptions (the checker hunts for these):
  - Seasons come from Earth being closer to the sun -> it's the **tilt**. Also: Earth does not
    rock toward and away during the year; the tilt points the same way all year. To a
    4-year-old "leans away" sounds like "farther away": say "tips" and "the sun stays low".
  - The sky is blue because it reflects the ocean -> **scattering**.
  - Moon phases are Earth's shadow -> it's **how much of the sunlit half we see**.
  - Heavier things fall faster (ignoring air) -> they fall **together**.
  - Plants get their food from the soil -> they **make sugar from air, water and light**.
  - Blood is blue inside the body -> it's always **red**.
  - Bats are blind / goldfish have 3-second memory / we use 10% of our brain -> **myths**.
  - Lightning never strikes twice -> it **often does**.
  - Camels store water in humps -> **fat**.
  - Ostriches bury their heads -> **myth**.
  - Mixing paint and mixing light work the same way -> they **don't**.
- Scary detail beyond what the question needs (death, disease, disasters): answer gently and
  briefly, point to a trusted grown-up for more.
- Brands, real living people, politics, religion-as-fact, medical or safety advice.

## Follow-ups ("But why?" chips)
- 2-3 questions, each a **natural next "why"** a curious kid would ask after this paragraph.
- Each one is answerable in one Kurious card, short (max 48 characters), and starts with
  Why / How / What / Where / Do / Can.
- Mix one that **goes deeper** (into the mechanism) with one that **goes sideways** (a related
  everyday wonder). Never repeat the original question.

## Image prompt
- Describe **the mechanism or scene concretely** (what's in the picture, where, doing what),
  e.g. "sunbeams scattering into a blue sky over hills, a child looking up".
- One clear subject; friendly; kids shown are diverse and not identifiable.
- **No text, letters, numbers, labels, diagrams with words.** The style suffix in
  `src/config.ts` (`IMAGE_STYLE_SUFFIX`) is appended by the pipeline; don't repeat style words.

## Safety labels (the cheap classifier)
- **ok:** ordinary curiosity (nature, body, space, animals, how things work).
- **gentle:** sensitive but fine to answer softly (death of a pet, why people get sick, why
  people fight). Answer kindly and briefly; never on the public Wall.
- **decline:** needs a trusted grown-up, not an app: abuse, self-harm, a specific medical
  symptom ("why does my tummy hurt every day"), sexual content, violence how-to, anything
  asking about a specific real person. The card shows a kind redirect, no answer.
- **personal = true** when the question includes a name, school, address, or other detail
  about a real person or family. Personal cards are never public.

## Checker rubric (different provider from the writer)
Fail the paragraph if ANY of these hold; list each as one short issue:
1. A factual claim is false or stated more certainly than science supports (a closing hedge
   doesn't excuse earlier sentences stated as fact).
2. It contains a misconception from the list above (or a close cousin).
3. The comparison implies a wrong mechanism.
4. It uses jargon or ideas too advanced for the age band without explaining them. (Word and
   sentence counts are enforced in code with some slack, never by the checker: a truth badge
   must not hinge on one extra word.)
5. It doesn't actually answer the question asked.
6. It's scary, preachy, or includes anything from "Never".
7. A follow-up presupposes something false or imprecise ("29 days" for ~29.5), repeats another,
   or can't be answered in one card; or the image prompt asks for text, is scary, or pictures a
   wrong mechanism. (The checker sees the follow-ups and image prompt too.)
A rewrite gets the issues verbatim and fixes only those.
