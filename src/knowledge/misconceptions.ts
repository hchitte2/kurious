/**
 * Misconception cards (PLAN P2 #1): classic mistakes kids, and the grown-ups
 * explaining things to them, fall for. Seeded into DeepSpace managed knowledge
 * (src/knowledge/lookup.ts) and retrieved by question similarity, then handed
 * to the writer (avoid these) and the checker (hunt for these).
 *
 * Format and rules: .claude/skills/misconception-cards/SKILL.md. Every card
 * follows the kid-explainer-style truth rules; keep each under ~120 words.
 *
 * `id` is stable: it is the knowledge filename (`<id>.md`) and what the job
 * logs. Retrieval maps a hit back to the card here by id, so the prompt always
 * gets this exact text. Editing a card's text needs no re-seed; bump
 * KNOWLEDGE_VERSION (src/config.ts) only when Triggers change enough to
 * matter for retrieval.
 */

export interface MisconceptionCard {
  /** Stable kebab-case id: the knowledge filename and the log key. */
  id: string
  topic: string
  /** The misconception in a kid's words (the card heading). */
  kidWords: string
  wrong: string
  right: string
  whyKidsThinkIt: string
  sayInstead: string
  /** Question phrasings that should retrieve this card. */
  triggers: string[]
}

export const MISCONCEPTION_CARDS: readonly MisconceptionCard[] = [
  {
    id: 'seasons-distance',
    topic: 'Seasons',
    kidWords: "It's summer because Earth gets closer to the sun",
    wrong: 'Seasons happen because Earth moves closer to the sun in summer and farther away in winter.',
    right:
      'Seasons come from Earth being tipped: as Earth goes around the sun, your half takes turns getting high, strong sunshine and long days.',
    whyKidsThinkIt: 'Getting closer to a fire or a heater makes you warmer, so distance feels like the obvious cause.',
    sayInstead:
      'Earth is tipped a little. In summer, the sun climbs high in your sky and days are long, so things warm up. In winter, the sun stays low and days are short.',
    triggers: [
      'why is it hot in summer',
      'why is winter cold',
      'why do we have seasons',
      'is the sun closer in summer',
      'why are summer days longer',
    ],
  },
  {
    id: 'summer-closest',
    topic: 'Seasons',
    kidWords: 'Earth is closest to the sun in summer',
    wrong: 'Earth is at its closest to the sun during summer.',
    right:
      'Earth is closest to the sun in early January, which is winter in the north and summer in the south.',
    whyKidsThinkIt: 'Being near something warm makes you warm, so summer seems like it must be the "close" time.',
    sayInstead:
      "Earth's path around the sun is almost a circle, so our distance changes only a little. We are actually closest in January, when it's winter in Canada and summer in Australia.",
    triggers: [
      'when is earth closest to the sun',
      'are we closer to the sun in summer',
      'why is it summer in australia at christmas',
      'does distance from the sun make seasons',
    ],
  },
  {
    id: 'tilt-rocks',
    topic: 'Seasons',
    kidWords: 'Earth tips toward the sun, then tips away',
    wrong: 'Earth rocks during the year, tipping toward the sun in summer and away in winter.',
    right:
      "Earth's tilt points the same way all year; as Earth goes around the sun, each half takes a turn getting the steeper sunlight.",
    whyKidsThinkIt:
      'Books say your half is "tilted toward the sun" in summer, which sounds like the tilt moves, and "tipped away" sounds like "farther away".',
    sayInstead:
      'Earth stays tipped the same way all year, its North Pole pointing near the North Star. As Earth goes around the sun, your half gets high, strong sunshine for part of the year and low sunshine the rest.',
    triggers: [
      'does earth tip toward the sun',
      "why does earth's tilt change",
      'what is earth tilt',
      'why does the north pole get sun in summer',
    ],
  },
  {
    id: 'sky-ocean',
    topic: 'Sky',
    kidWords: 'The sky is blue because it reflects the ocean',
    wrong: 'The sky is blue because it reflects the blue ocean.',
    right:
      'Air bounces blue light around the sky much more than red or yellow light, so blue light reaches your eyes from every direction.',
    whyKidsThinkIt: 'The sky and the sea are both blue and seem to meet at the horizon, so they look connected.',
    sayInstead:
      'Sunlight is made of all the colors. Tiny bits of air bounce the blue part all over the sky, so wherever you look up, blue light comes toward you. The sky is blue over deserts too, far from any ocean.',
    triggers: [
      'why is the sky blue',
      'does the sky reflect the ocean',
      'what color is the sky',
      'why is the sky blue in the day',
    ],
  },
  {
    id: 'moon-shadow',
    topic: 'Moon',
    kidWords: "The moon changes shape because Earth's shadow covers it",
    wrong: "Moon phases happen because Earth's shadow covers part of the moon.",
    right:
      'The sun always lights half of the moon; phases are how much of that sunlit half we can see from Earth as the moon goes around us.',
    whyKidsThinkIt: "Shadows make things dark, and Earth's shadow really does darken the moon in an eclipse, a different event.",
    sayInstead:
      'Half of the moon is always lit by the sun, like half of a ball held near a lamp. As the moon travels around Earth, we see different amounts of its bright half, from a thin sliver to a full circle.',
    triggers: [
      'why does the moon change shape',
      'why is the moon a crescent',
      'what is a half moon',
      'where does the moon go',
      "is the moon in earth's shadow",
    ],
  },
  {
    id: 'heavy-falls-faster',
    topic: 'Falling',
    kidWords: 'Heavy things fall faster than light things',
    wrong: 'A heavier thing always falls faster than a lighter thing.',
    right:
      'Without air in the way, heavy and light things fall together; air slows light, spread-out things like feathers much more.',
    whyKidsThinkIt: 'A feather or a leaf really does drift down slowly, because air pushes back on it.',
    sayInstead:
      'Drop a heavy ball and a light ball of the same size together, and they land at almost the same time. A feather floats down slowly only because air gets in its way. On the moon, with no air, a hammer and a feather landed together.',
    triggers: [
      'do heavy things fall faster',
      'why does a feather fall slowly',
      'why do things fall down',
      'what falls faster',
      'why do things fall at the same speed',
    ],
  },
  {
    id: 'plants-eat-soil',
    topic: 'Plants',
    kidWords: 'Plants eat dirt',
    wrong: 'Plants get their food from the soil.',
    right:
      'Plants make their own food, a kind of sugar, from air, water and sunlight; soil gives them water and small amounts of minerals.',
    whyKidsThinkIt: 'Roots sit in the soil and people "feed" plants with plant food, so soil looks like their dinner.',
    sayInstead:
      'A plant makes its own food. Its leaves take in a gas from the air, its roots bring up water, and sunlight powers the making of sugar. Most of a big tree is built from air and water, not dirt.',
    triggers: [
      'what do plants eat',
      'why do plants need sun',
      'do plants eat soil',
      'how do plants grow',
      'why do plants need water',
      'where does a tree come from',
    ],
  },
  {
    id: 'blue-blood',
    topic: 'Body',
    kidWords: 'Blood is blue inside you',
    wrong: 'Blood is blue inside the body and turns red when it touches air.',
    right: 'Blood is always red: bright red when it carries lots of oxygen, darker red when it carries less.',
    whyKidsThinkIt: 'Veins look blue through skin, and body drawings color them blue.',
    sayInstead:
      'Your blood is always red. Veins only look blue because of how light goes into your skin and bounces back out to your eyes. Drawings color veins blue just to tell them apart from arteries.',
    triggers: ['is blood blue', 'why are veins blue', 'why is blood red', 'what color is blood', 'why do my veins look blue'],
  },
  {
    id: 'bats-blind',
    topic: 'Animals',
    kidWords: 'Bats are blind',
    wrong: 'Bats are blind.',
    right:
      'No bats are blind; all bats can see, and many also find their way by listening to the echoes of their own calls.',
    whyKidsThinkIt: 'People say "blind as a bat," and bats fly in the dark using sound.',
    sayInstead:
      'Bats have eyes and can see. Many bats also make very high squeaks, most too high for people to hear, and listen for the echoes to find bugs in the dark. Big fruit bats mostly use their eyes and noses.',
    triggers: [
      'are bats blind',
      'how do bats see in the dark',
      'how do bats fly at night',
      'what is echolocation',
      'blind as a bat',
    ],
  },
  {
    id: 'goldfish-memory',
    topic: 'Animals',
    kidWords: 'Goldfish forget everything after three seconds',
    wrong: 'Goldfish have a three-second memory.',
    right: 'Goldfish can remember things for weeks and even months, and they can learn tricks and feeding times.',
    whyKidsThinkIt: "It's a popular joke, and a fish swimming the same loop looks like it keeps forgetting.",
    sayInstead:
      'Goldfish are better at remembering than people think. Scientists have trained goldfish to push a lever or swim to a sound for food, and the fish still remembered weeks later.',
    triggers: [
      'do goldfish have a 3 second memory',
      'do fish remember things',
      'are goldfish smart',
      'can fish learn tricks',
      'how long do fish remember',
    ],
  },
  {
    id: 'brain-ten-percent',
    topic: 'Body',
    kidWords: 'We only use 10% of our brain',
    wrong: 'People only use 10 percent of their brain.',
    right: 'You use all of your brain; different parts do different jobs, and over a day nearly every part gets busy.',
    whyKidsThinkIt: "Movies repeat it, and it's exciting to imagine a hidden superpower.",
    sayInstead:
      'Your whole brain works for you. One part helps you see, another helps you move, another helps you remember, and brain scans show activity all over. Even while you sleep, lots of your brain is busy.',
    triggers: [
      'do we only use 10 percent of our brain',
      'how much of my brain do i use',
      'what does the brain do',
      'can i use more of my brain',
    ],
  },
  {
    id: 'lightning-twice',
    topic: 'Weather',
    kidWords: 'Lightning never strikes the same place twice',
    wrong: 'Lightning never strikes the same place twice.',
    right: 'Lightning can and often does strike the same place again, especially tall things like towers and tall buildings.',
    whyKidsThinkIt: "It's a common saying, used to mean that bad luck won't happen again.",
    sayInstead:
      'Lightning often hits tall things that stick up high, and it can hit them again and again. A very tall building in New York City gets hit many times every year. The saying is just a saying, not science.',
    triggers: [
      'does lightning strike the same place twice',
      'where does lightning hit',
      'why does lightning hit tall things',
      'why does lightning strike trees',
    ],
  },
  {
    id: 'camel-humps',
    topic: 'Animals',
    kidWords: 'Camels keep water in their humps',
    wrong: "A camel's hump is a tank of stored water.",
    right:
      "A camel's hump is mostly fat, stored food; camels go without drinking for a long time because their bodies are very good at saving water.",
    whyKidsThinkIt: 'Camels go a long time without a drink, and the hump looks like a backpack full of supplies.',
    sayInstead:
      "A camel's hump is a big lump of fat, like a packed lunch it can live on when food is hard to find. Camels lose very little water, so they can go a long time between drinks, and then they drink a huge amount at once.",
    triggers: [
      "what is in a camel's hump",
      'do camels store water',
      'how do camels live in the desert',
      'why do camels have humps',
      'how long can a camel go without water',
    ],
  },
  {
    id: 'ostrich-heads',
    topic: 'Animals',
    kidWords: 'Ostriches bury their heads in the sand when they are scared',
    wrong: 'Ostriches hide by burying their heads in the sand.',
    right:
      'Ostriches never bury their heads; they run or kick to stay safe, and dip their heads into their ground nests to turn their eggs.',
    whyKidsThinkIt:
      'From far away, an ostrich with its head down at its nest, or lying flat with its neck on the ground, looks like its head is buried.',
    sayInstead:
      'Ostriches never bury their heads. They dig nests in the ground and dip their heads down to turn their eggs, and from far away that looks like hiding. When danger comes, an ostrich can run super fast.',
    triggers: [
      'do ostriches bury their heads',
      'why do ostriches put their heads in the sand',
      'how do ostriches hide',
      'how fast can an ostrich run',
    ],
  },
  {
    id: 'paint-vs-light',
    topic: 'Color',
    kidWords: 'Mixing colored light works like mixing paint',
    wrong: 'Mixing colored lights works the same way as mixing paints.',
    right:
      'Mixing paints soaks up more colors, so the mix gets darker; mixing lights adds colors, so the mix gets brighter, and red, green and blue light together look white.',
    whyKidsThinkIt: 'Both are called "mixing colors," and most kids have only ever mixed paint.',
    sayInstead:
      'Paint soaks up some colors and bounces back the rest, so mixing paints soaks up more and gets darker. Lights add together instead: red and green light make yellow, and red, green and blue light together look white.',
    triggers: [
      'why does mixing colors make brown',
      'what colors make white',
      'how do screens make colors',
      'what are the primary colors',
      'does mixing all colors make black',
    ],
  },
  {
    id: 'sun-yellow',
    topic: 'Sun',
    kidWords: 'The sun is yellow',
    wrong: 'The sun is yellow.',
    right:
      'Sunlight is a mix of all the colors, which together look white; the sun looks yellow, orange or red near sunrise and sunset because air scatters away some of its blue light.',
    whyKidsThinkIt: 'Drawings always show a yellow sun, and near sunrise and sunset it really does look yellow or orange.',
    sayInstead:
      "Sunlight is all the colors mixed together, which looks white. That's why sunlight makes white paper look white. When the sun is low, its light passes through lots of air, which scatters blue light away, so the sun looks yellow or orange.",
    triggers: [
      'what color is the sun',
      'why is the sun yellow',
      'is the sun white',
      'why is the sun orange at sunset',
      'why is the sunset red',
    ],
  },
  {
    id: 'stars-twinkle',
    topic: 'Stars',
    kidWords: 'Stars twinkle by blinking on and off',
    wrong: 'Stars twinkle because the stars themselves flicker on and off.',
    right:
      'The twinkling comes from our air, not the star: moving air above us bends the thin beam of starlight back and forth before it reaches our eyes.',
    whyKidsThinkIt: 'The twinkling really looks like the star is blinking, like a flashing light.',
    sayInstead:
      "A star's light travels a long way, and at the very end it passes through our moving, wiggly air. The air bends the tiny beam back and forth, so the star seems to twinkle. Astronauts in space see stars that don't twinkle.",
    triggers: ['why do stars twinkle', 'do stars blink', 'why do stars sparkle', 'are stars flashing'],
  },
  {
    id: 'rain-clouds-bump',
    topic: 'Rain',
    kidWords: 'Rain falls when clouds bump into each other',
    wrong: 'Rain falls when clouds bump or crash into each other.',
    right:
      'Clouds are made of tiny water droplets or ice bits; rain falls when lots of them join into drops big and heavy enough to fall.',
    whyKidsThinkIt: 'Thunder sounds like a crash, and clouds look like soft things floating into each other.',
    sayInstead:
      "A cloud is made of billions of droplets so tiny they float. Inside the cloud, droplets bump and join, growing bigger. When drops get big enough, they fall as rain. Thunder isn't clouds crashing either: it's the boom of air heated super fast by lightning.",
    triggers: [
      'why does it rain',
      'where does rain come from',
      'do clouds bump into each other',
      'what makes thunder',
      'how do clouds make rain',
    ],
  },
  {
    id: 'sweat-is-cold',
    topic: 'Body',
    kidWords: 'Sweat cools you because sweat is cold',
    wrong: 'Sweat cools you down because sweat is cold water.',
    right: 'Sweat comes out warm; it cools you as it dries up, because turning into vapor takes heat away from your skin.',
    whyKidsThinkIt: 'Cold water feels cooling, so sweat seems like a built-in cold shower.',
    sayInstead:
      'Sweat comes out as warm as you are. As it dries into the air, it carries heat away from your skin. That is the same chilly feeling you get when you climb out of a pool and a breeze dries you.',
    triggers: [
      'why do we sweat',
      'how does sweat cool you',
      "why do i sweat when i'm hot",
      'why do dogs pant',
      'why does wind feel cold when you are wet',
    ],
  },
  {
    id: 'hot-air-rises',
    topic: 'Air',
    kidWords: 'Hot air rises all by itself because it is light',
    wrong: 'Hot air floats up on its own, as if being light gave it its own lift.',
    right: 'Warm air is less dense than the cool air around it, so the heavier cool air sinks underneath and pushes the warm air up.',
    whyKidsThinkIt: 'We say "hot air rises," which makes it sound like warm air lifts itself.',
    sayInstead:
      'A jar of warm air weighs a tiny bit less than the same jar of cool air. The heavier cool air sinks underneath and pushes the warm air up, the way water pushes a beach ball up in a pool.',
    triggers: [
      'why does hot air rise',
      'how do hot air balloons fly',
      'why is upstairs warmer',
      'why does smoke go up',
      'why does steam go up',
    ],
  },
  {
    id: 'sound-in-space',
    topic: 'Space',
    kidWords: 'You can hear explosions in space',
    wrong: 'Sounds like explosions and rocket roars travel through space.',
    right: 'Sound needs something to travel through, like air or water; space is almost empty, so sound cannot cross it.',
    whyKidsThinkIt: 'Movies add booms and whooshes to space scenes.',
    sayInstead:
      'Sound is a wiggle passed from one tiny bit of air to the next. Space has almost nothing to pass the wiggle along, so it is silent. Astronauts outside their spaceship talk by radio, which can cross empty space.',
    triggers: [
      'is there sound in space',
      'can you hear in space',
      'why is space quiet',
      'how do astronauts talk in space',
      'do rockets make noise in space',
    ],
  },
  {
    id: 'tongue-map',
    topic: 'Body',
    kidWords: 'Each part of your tongue tastes one flavor',
    wrong: 'Different parts of the tongue taste different flavors, like sweet only at the tip.',
    right:
      'Taste buds all around the tongue can sense every basic taste: sweet, salty, sour, bitter and savory (umami).',
    whyKidsThinkIt: 'An old "tongue map" drawing put sweet at the tip and bitter at the back, and books copied it for years.',
    sayInstead:
      'Your tongue has thousands of tiny taste buds, and the ones all around it can taste sweet, salty, sour, bitter and savory. That old tongue map was a mistake that got copied again and again.',
    triggers: [
      'how does my tongue taste',
      'where on the tongue do you taste sweet',
      'what is the tongue map',
      'how many tastes are there',
      'how do we taste food',
    ],
  },
  {
    id: 'knuckle-arthritis',
    topic: 'Body',
    kidWords: 'Cracking your knuckles gives you arthritis',
    wrong: 'Cracking your knuckles causes arthritis.',
    right:
      "Studies haven't found that knuckle cracking causes arthritis; scientists think the pop comes from a gas bubble forming in the slippery fluid inside the joint.",
    whyKidsThinkIt: 'Grown-ups often warn about it, and the pop sounds like something breaking.',
    sayInstead:
      'Your finger joints have a slippery liquid inside. Scientists think that when you pull or bend a finger, a little gas bubble forms in that liquid with a pop. Scientists who studied knuckle crackers did not find more arthritis.',
    triggers: [
      'why do knuckles crack',
      'is cracking knuckles bad',
      'why do my fingers pop',
      'what is the cracking sound in my joints',
    ],
  },
  {
    id: 'dinosaurs-people',
    topic: 'Dinosaurs',
    kidWords: 'Cave people lived with dinosaurs',
    wrong: 'People and dinosaurs like T. rex lived at the same time.',
    right:
      'The giant dinosaurs died out about 66 million years ago, more than 60 million years before the first people; birds are the dinosaurs still alive today.',
    whyKidsThinkIt: 'Cartoons show cave people with dinosaurs, and both are "from long, long ago."',
    sayInstead:
      "The giant dinosaurs were gone millions and millions of years before the first people. If all of Earth's story were squished into one day, people would show up only in the last few seconds. But birds come from dinosaurs, so you see their relatives every day.",
    triggers: [
      'did people live with dinosaurs',
      'when did dinosaurs live',
      'did cavemen see dinosaurs',
      'are birds dinosaurs',
      'why are there no dinosaurs now',
    ],
  },
  {
    id: 'bacteria-bad',
    topic: 'Germs',
    kidWords: 'All bacteria are bad',
    wrong: 'All bacteria are bad germs that make you sick.',
    right:
      'Most bacteria are harmless and many are helpful, like the ones in your gut that help break down food; only some kinds make people sick.',
    whyKidsThinkIt: 'Grown-ups mostly talk about germs when something is dirty or someone is sick, so bacteria sound like bad guys.',
    sayInstead:
      'Bacteria are tiny living things that are everywhere, even inside you. Most don\'t hurt you, and lots of them help, like the ones in your belly that help break down food, or the ones that turn milk into yogurt. Only some kinds make people sick.',
    triggers: [
      'are all germs bad',
      'what are bacteria',
      'are bacteria good',
      'why do we have germs',
      'how is yogurt made',
    ],
  },
  {
    id: 'chameleon-background',
    topic: 'Animals',
    kidWords: 'Chameleons change color to match whatever they sit on',
    wrong: "Chameleons change color mainly to match the background they're on.",
    right:
      'Chameleons change color mostly to signal to other chameleons and to help control their body temperature; their resting colors already help them hide.',
    whyKidsThinkIt: 'Cartoons show chameleons matching any background, so hiding seems like the obvious reason.',
    sayInstead:
      'A calm chameleon is often green or brown, which already blends in with leaves and branches. Its color changes are mostly signals: when it meets a rival or a mate, it can flash bright colors. It can also turn darker to soak up more warmth.',
    triggers: [
      'why do chameleons change color',
      'how do chameleons change color',
      'do chameleons match the background',
      'how do animals camouflage',
    ],
  },
]

/** The knowledge filename for a card (the item key is `<folder>/<file>`). */
export function cardFileName(id: string): string {
  return `${id}.md`
}

const BY_ID = new Map(MISCONCEPTION_CARDS.map((card) => [card.id, card]))

export function misconceptionById(id: string): MisconceptionCard | undefined {
  return BY_ID.get(id)
}

/** The card as indexed in managed knowledge (the skill's markdown format). */
export function renderCardMarkdown(card: MisconceptionCard): string {
  return `# ${card.topic}: "${card.kidWords}"
- **Wrong:** ${card.wrong}
- **Right:** ${card.right}
- **Why kids think it:** ${card.whyKidsThinkIt}
- **Say instead:** ${card.sayInstead}
- **Triggers:** ${card.triggers.join(', ')}
`
}
