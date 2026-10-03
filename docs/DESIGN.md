# Kurious: design direction

**Feel:** a warm, hand-made picture book you can talk to. It should feel like paper, crayons
and a curious owl friend, not "an AI app". A 5-year-old should be able to use it with a
grown-up nearby, and a grown-up should trust it at a glance.

Before building UI, have `docs-researcher` summarize the DeepSpace design docs (Design
direction, Style tile, Pattern library, **Anti-AI gate**, Product polish). Follow them where
they don't conflict with this file.

If `docs/design/*.png` exists, those screens win on **layout and composition**. This file wins
on **tokens**, unless the screens clearly use different ones; in that case, update the tokens
here to match.

---

## Principles
1. **One obvious thing to do per screen.** On Ask, it's ask. On a card, it's listen or tap
   "But why?".
2. **Pictures and voice before text.** A pre-reader can still use it: big picture, a big play
   button, icon-plus-word chips.
3. **Waiting is part of the fun.** Show the paragraph the moment it's written, let the picture
   "paint in", and keep the owl visibly busy.
4. **No dead ends.** Every state offers a next step: follow-ups, "Ask something new", or a
   suggestion.
5. **Grown-up things stay small and tucked away:** sign-in, the age band, the Checked
   tooltip, sharing.
6. **Big targets:** primary actions are at least 56px tall, everything else at least 44px.
   Thumb-friendly on phones and tablets (kids use iPads).

## Tokens (Tailwind v4 `@theme`)
```css
@theme {
  --color-paper: #FFF8EC;      /* page background */
  --color-paper-2: #FBEFD9;    /* sections, card body */
  --color-ink: #1E2A44;        /* text, borders */
  --color-ink-soft: #4A5672;   /* secondary text */
  --color-sun: #FF8A3D;        /* primary action (ink text on it) */
  --color-sun-deep: #E06A1F;   /* primary pressed/shadow */
  --color-sky: #5BB6F0;        /* secondary, chips */
  --color-leaf: #3FA86B;       /* Checked */
  --color-star: #FFD23F;       /* highlights, current trail stop */
  --color-berry: #E85D8C;      /* accent chips */
  --color-night: #18203A;      /* Wonder Wall header, constellation */

  --font-display: "Fredoka", ui-rounded, system-ui, sans-serif;  /* titles, buttons, chips */
  --font-read: "Andika", "Atkinson Hyperlegible", system-ui, sans-serif; /* the card paragraph: made for early readers */

  --radius-card: 24px;
  --radius-pill: 999px;
}
```
- **Fonts:** self-host via `@fontsource` packages (check what's available). Fall back to the
  system stack.
- **Surface style: "cut paper".** Use solid offset shadows in a darker tint of the element's
  own color (e.g. a sun button gets a `0 4px 0 var(--color-sun-deep)` shadow), not blurry grey
  shadows. On press, the element moves down 2px and the shadow shrinks.
- **Borders:** 2px `ink` at 10-15% opacity on cards, solid on focused inputs.
- **Contrast:** use ink text on sun, sky, star and leaf tints, never white text on sun. Body text
  must meet WCAG AA contrast.

## Type scale
| Use | Mobile | Tablet+ |
|---|---|---|
| Card paragraph (`font-read`) | 22px / 1.6 | 26px / 1.6, max ~55 characters per line |
| Question title (`font-display`, 600) | 28px | 36px |
| Home heading | 32px | 44px |
| Chips and buttons (`font-display`, 500) | 18px | 20px |
| UI small text | 15px | 16px |

## Motion
- **Paragraph reveal:** fade and rise sentence by sentence (about 120ms apart) when it first
  arrives.
- **Picture:** a paper-texture placeholder with a slow brush-wipe mask that reveals the image
  when it loads.
- **Chips:** pop in with a light spring (scale 0.9 -> 1) after the paragraph.
- **Owl:** idle blink. While generating: "thinking" (head tilt), "painting" (brush), "recording"
  (sound waves). All of this is CSS on a single static SVG.
- **`prefers-reduced-motion`:** swap every animation for a simple fade.

## The mascot
**Kuri** is a small round owl in sun-orange and cream with big curious eyes. It's a static SVG
(never AI-generated) with CSS-animated parts. Kuri appears on Ask, while generating, on the
declined and error states, and in empty states. Keep it small on the card itself, because the
picture is the star there.

## Illustrations (the image style suffix in `src/config.ts`)
`soft gouache children's picture-book illustration, warm cream paper texture, gentle rounded shapes, limited palette of warm orange, sky blue, leaf green and sunny yellow, friendly and calm, no text, no letters, no numbers`

This matches the UI palette so the pictures feel native to the app. Use a 4:3 aspect ratio.

## Copy voice
- Short, warm, second person. Buttons are verbs: "Ask Kuri", "Read it to me", "Ask something
  new".
- Kids never see the words "AI", "model" or "generated". Grown-ups see them only in the
  Checked tooltip and the about page.
- Error copy is playful but clear: "Oops, my paintbrush slipped. Try again?"

## Avoid (the generic-AI look)
- Purple-to-blue gradients, glassmorphism, neon glows, dark-mode-first design.
- Sparkle or robot icons for "AI magic", emoji as UI icons (use lucide icons or small custom
  doodles).
- Chat-bubble layouts. This is a card, not a chat.
- Tiny grey text, dense layouts, more than one primary button per screen.

---

## Screens

Design and build these at **390px (phone)** and **1024px (tablet landscape)**. Desktop centers
at a max width of ~1100px.

### 1. Ask (`/`)
- **Top bar:**
  - left: the wordmark "Kurious" in Fredoka, with a small star as the dot over the i
  - right: a "Wonder Wall" link and a grown-up menu (sign in/out)
- **Hero:**
  - Kuri peeks over the top edge of a big rounded input card
  - heading: "What are you wondering about?"
  - the input is about 64px tall, with a placeholder that rotates through examples
    ("Why is the sky blue?")
  - primary button: "Ask Kuri"
- **Age band:** a three-option segmented control under the input: "4-5 · 6-8 · 9-11", each with
  a tiny growing-plant icon. It remembers the last choice.
- **Suggestion bubbles:** 6-8 colorful pills, each with an icon and a short question (moon,
  snowflake/ice, apple, rainbow, dinosaur, star, rain, volcano). Tapping one asks immediately.
- **Strip:** "Fresh from the Wonder Wall", 4-6 small cards in a horizontal scroll.
- **Signed out:** tapping Ask opens a friendly sheet: "Grown-ups: sign in so Kuri can answer."
  Browsing stays open.

### 2. Card: generating (`/c/:id`)
- **Trail breadcrumb** at the top: stepping stones (small circles joined by a dotted line) with
  short labels. The current stop is a star.
- **Question** as the title.
- **Stage row:** four steps with Kuri animating to match: Thinking -> Checking -> Painting ->
  Recording.
- **Picture slot:** paper texture with the brush-wipe animation.
- **Paragraph slot:** shimmering rounded lines until the text arrives, then the sentence reveal.

### 3. Card: ready
- **Phone:**
  - the picture on top (4:3, rounded 24px)
  - a 64px round play button overlapping the picture's bottom-right corner, labelled
    "Read it to me" for screen readers
  - the paragraph below the picture
- **Tablet landscape:** the picture on the left (~55%), with the paragraph and controls on the
  right.
- **Badges:** a small leaf-green "Checked" pill with an info tooltip for grown-ups ("A second
  AI from a different company checked this for common mix-ups"), and a tiny age-band label.
- **"But why?" section:**
  - 2-3 big chips with a "?" bubble icon, alternating sky, berry and star tints
  - full width on phones, wrapping on tablets
  - tapping one starts the next card in the trail
- **Footer:** "Ask something new" (secondary button) and a share icon (copies the public link).

### 4. Card: declined and error
- **Declined:** Kuri with a soft expression, "That's a great question to ask a grown-up you
  trust.", and three suggestion bubbles.
- **Error:** "Oops, my paintbrush slipped." with a Retry button. Any partial content (the
  paragraph, if it was written) stays visible.

### 5. Wonder Wall (`/wall`)
- **Header band** in `night` with a few twinkling stars: "Wonder Wall: what kids are wondering".
- **Masonry grid** of cards: the picture, the question, and an age chip. Hover or press lifts
  the card.
- **Loading:** `usePagedResource` with a "Load more" button. The empty state shows Kuri saying
  "No wonders yet. Be the first!"

### 6. My questions (`/me`, P1)
- Each trail is a row of stepping stones (one thumbnail per stop). Tapping a stone opens that
  card.
