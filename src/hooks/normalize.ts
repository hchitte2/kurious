import { type CardView, toCardView } from '../shared/card'

/**
 * Cards from worker routes (Wall, public card) are already CardView, but stay
 * defensive: coalesce anything missing back to the contract's shape before a
 * component sees it.
 */
export function normalizeView(view: CardView): CardView {
  return {
    ...view,
    paragraph: view.paragraph ?? null,
    keyIdea: view.keyIdea ?? null,
    followUps: Array.isArray(view.followUps) ? view.followUps : [],
    imageUrl: view.imageUrl ?? null,
    audioUrl: view.audioUrl ?? null,
    trail: Array.isArray(view.trail) ? view.trail : [],
    checked: view.checked === true,
    isPublic: view.isPublic === true,
  }
}

/** Owner records: toCardView normalizes the raw `data` (the record room drops null columns). */
export function recordToView(record: { recordId: string; data: unknown; createdAt: string; updatedAt: string }): CardView {
  return toCardView(record)
}
