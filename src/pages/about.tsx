/**
 * About (`/about`): the grown-ups page. A STATIC page (top level of
 * src/pages/, no DeepSpace providers), prerendered at build for crawlers.
 * Keep it renderable without a browser: no window/localStorage in render.
 */

import { Link } from 'react-router-dom'
import { primaryButton } from '../components/kurious/buttons'
import { Kuri } from '../components/kurious/Kuri'
import { StaticHeader } from '../components/kurious/StaticHeader'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

const STEPS = [
  {
    title: 'A quick safety look',
    body: 'Before anything is written, a small model reads the question. Questions that are personal, or better answered by a grown-up the child trusts, get a gentle redirect instead of an answer.',
  },
  {
    title: 'One short, true paragraph',
    body: 'An AI writes one paragraph pitched at the age you picked (4-5, 6-8 or 9-11), plus two or three “But why?” questions to keep exploring.',
  },
  {
    title: 'A second opinion',
    body: 'A second AI, from a different company, checks the paragraph for common mix-ups and age fit. If it finds a problem, the answer is rewritten once. Cards that pass show a small “Checked” badge.',
  },
  {
    title: 'A picture and a voice',
    body: 'Kuri paints one picture-book illustration and reads the paragraph aloud, so pre-readers can follow along.',
  },
]

export default function AboutPage() {
  return (
    <>
      <Seo
        title="About Kurious | One true answer to every why"
        description="How Kurious answers kids' why questions: a safety check, one short paragraph for their age, a second AI that checks it, a picture and a voice."
        origin={seo.origin}
        path="/about"
        noindex={seo.noindex}
      />
      <div data-testid="static-landing" className="min-h-screen">
        <StaticHeader />
        <main className="mx-auto max-w-[760px] px-4 pb-24 pt-6 md:px-6 md:pt-10">
          <div className="flex items-center gap-4">
            <Kuri size={88} />
            <div>
              <h1 className="font-display text-[32px] font-semibold leading-tight text-ink md:text-[44px]">For grown-ups</h1>
              <p className="mt-1 text-[17px] text-ink-soft">How Kurious answers a child’s “why?”</p>
            </div>
          </div>

          <p className="mt-8 font-read text-[19px] leading-[1.65] text-ink md:text-[21px]">
            A child asks a question. Kuri the owl answers with one picture, one short paragraph read aloud, and two or
            three “But why?” buttons that lead to the next card. That’s the whole idea: one true answer at a time,
            instead of a wall of text.
          </p>

          <h2 className="mt-12 font-display text-[24px] font-semibold text-ink md:text-[28px]">How a card is made</h2>
          <ol className="mt-5 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 rounded-card border-2 border-ink/10 bg-cream p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-star font-display text-[18px] font-semibold text-ink">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-[19px] font-semibold text-ink md:text-[20px]">{step.title}</h3>
                  <p className="mt-1 text-[16px] leading-relaxed text-ink-soft md:text-[17px]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mt-12 font-display text-[24px] font-semibold text-ink md:text-[28px]">Good to know</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 text-[16px] leading-relaxed text-ink-soft marker:text-sun md:text-[17px]">
            <li>Kids don’t have accounts. A grown-up signs in, and each account has a daily limit of new questions.</li>
            <li>
              The Wonder Wall only shows cards that passed every check, have a picture, and contain nothing personal.
            </li>
            <li>
              AI can still get things wrong. Kurious is built to be read together, so if something sounds off, it’s a
              great moment to wonder out loud with your child.
            </li>
          </ul>

          <div className="mt-12 flex justify-center">
            <Link to="/" className={primaryButton}>
              Ask Kuri a question
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}
