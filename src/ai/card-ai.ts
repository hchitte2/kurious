/**
 * The three model calls of the make-card job: safety, writer (+ one rewrite),
 * checker. Owner-billed (`createDeepSpaceAI` with no authToken), so they are
 * only reachable from the job, behind sign-in and the daily caps.
 *
 * AI SDK 7: generateText + Output.object (spike S2). Zod schemas use
 * .nullable(), never .optional()/.default() (OpenAI strict mode), and no .max
 * on arrays (Anthropic only treats it as a hint; we trim in code).
 * maxRetries: 0 because the job's withRetry owns retries.
 */

import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createDeepSpaceAI } from 'deepspace/worker'
import { FOLLOW_UPS, MODELS, type ModelRole } from '../config'
import { normalizeQuestion, SAFETY_LABELS, type AgeBand, type CardSafety } from '../shared/card'
import type { Env } from '../../worker.js'
import type { MisconceptionCard } from '../knowledge/misconceptions'
import {
  checkerInstructions,
  checkerPrompt,
  rewritePrompt,
  SAFETY_INSTRUCTIONS,
  safetyPrompt,
  writerInstructions,
  writerPrompt,
} from './prompts.js'

function model(env: Env, role: ModelRole) {
  const choice = MODELS[role]
  return createDeepSpaceAI(env, choice.provider)(choice.modelId)
}

// ── Safety ──────────────────────────────────────────────────────────────────

const SafetySchema = z.object({
  label: z.enum(SAFETY_LABELS).describe('ok | gentle | decline'),
  personal: z.boolean().describe('true if the question has a name, school, address or other personal detail'),
})

export async function classifySafety(env: Env, question: string, signal: AbortSignal): Promise<CardSafety> {
  const { output } = await generateText({
    model: model(env, 'safety'),
    instructions: SAFETY_INSTRUCTIONS,
    prompt: safetyPrompt(question),
    output: Output.object({ schema: SafetySchema, name: 'safety' }),
    maxOutputTokens: MODELS.safety.maxOutputTokens,
    maxRetries: 0,
    abortSignal: signal,
  })
  return { label: output.label, personal: output.personal }
}

// ── Writer ──────────────────────────────────────────────────────────────────

const DraftSchema = z.object({
  paragraph: z.string().min(1).describe('The one paragraph, read aloud to the child.'),
  keyIdea: z.string().min(1).describe('One short sentence: the single idea the paragraph teaches.'),
  followUps: z
    .array(z.string().min(1))
    .min(FOLLOW_UPS.min)
    .describe(`${FOLLOW_UPS.min}-${FOLLOW_UPS.max} short "But why?" follow-up questions.`),
  imagePrompt: z.string().min(1).describe('A concrete scene description for the illustrator. No text in the picture.'),
})

export interface CardDraft {
  paragraph: string
  keyIdea: string
  followUps: string[]
  imagePrompt: string
}

export interface WriteInput {
  question: string
  ageBand: AgeBand
  gentle: boolean
  /** Retrieved from managed knowledge (P2): the writer avoids these, the checker hunts for them. */
  misconceptions?: readonly MisconceptionCard[]
}

/** Trim everything; keep 2-3 distinct follow-ups that aren't the question itself. */
function tidyDraft(draft: z.infer<typeof DraftSchema>, question: string): CardDraft {
  const asked = normalizeQuestion(question)
  const seen = new Set<string>()
  const candidates = draft.followUps.map((followUp) => followUp.trim().replace(/\s+/g, ' ')).filter(Boolean)
  const distinct = candidates.filter((followUp) => {
    const key = normalizeQuestion(followUp)
    if (!key || key === asked || seen.has(key)) return false
    seen.add(key)
    return true
  })
  const followUps = (distinct.length >= FOLLOW_UPS.min ? distinct : candidates).slice(0, FOLLOW_UPS.max)
  return {
    paragraph: draft.paragraph.trim().replace(/\s*\n+\s*/g, ' '),
    keyIdea: draft.keyIdea.trim(),
    followUps,
    imagePrompt: draft.imagePrompt.trim(),
  }
}

async function runWriter(env: Env, input: WriteInput, prompt: string, signal: AbortSignal): Promise<CardDraft> {
  const { output } = await generateText({
    model: model(env, 'writer'),
    instructions: writerInstructions(input.ageBand, input.gentle),
    prompt,
    output: Output.object({ schema: DraftSchema, name: 'card' }),
    maxOutputTokens: MODELS.writer.maxOutputTokens,
    maxRetries: 0,
    abortSignal: signal,
  })
  return tidyDraft(output, input.question)
}

export function writeCard(env: Env, input: WriteInput, signal: AbortSignal): Promise<CardDraft> {
  return runWriter(env, input, writerPrompt(input.question, input.misconceptions), signal)
}

/** The one rewrite after a failed check: the issues go in verbatim. */
export function rewriteCard(
  env: Env,
  input: WriteInput,
  draft: CardDraft,
  issues: string[],
  signal: AbortSignal,
): Promise<CardDraft> {
  return runWriter(env, input, rewritePrompt(input.question, draft, issues, input.misconceptions), signal)
}

// ── Checker ─────────────────────────────────────────────────────────────────

const CheckSchema = z.object({
  verdict: z.enum(['pass', 'fail']),
  issues: z.array(z.string()).describe('One short, specific issue per problem. Empty when the verdict is pass.'),
})

export interface CheckResult {
  verdict: 'pass' | 'fail'
  issues: string[]
}

export async function checkCard(
  env: Env,
  input: {
    question: string
    ageBand: AgeBand
    paragraph: string
    keyIdea: string
    followUps: string[]
    imagePrompt: string
    misconceptions?: readonly MisconceptionCard[]
  },
  signal: AbortSignal,
): Promise<CheckResult> {
  const { output } = await generateText({
    model: model(env, 'checker'),
    instructions: checkerInstructions(input.ageBand),
    prompt: checkerPrompt(input.question, input, input.misconceptions),
    output: Output.object({ schema: CheckSchema, name: 'check' }),
    maxOutputTokens: MODELS.checker.maxOutputTokens,
    maxRetries: 0,
    abortSignal: signal,
    providerOptions: { openai: { reasoningEffort: 'low' } },
  })
  const issues = output.issues.map((issue) => issue.trim()).filter(Boolean)
  if (output.verdict === 'pass') return { verdict: 'pass', issues: [] }
  return {
    verdict: 'fail',
    issues: issues.length > 0 ? issues : ['The checker flagged this paragraph without details: re-verify every factual claim.'],
  }
}
