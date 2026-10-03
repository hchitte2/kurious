/**
 * Theme catalog. Kurious has a single light, paper-first look; its tokens live
 * in the @theme block in styles.css (from docs/DESIGN.md).
 */

export const THEMES = [
  {
    id: 'kurious',
    label: 'Kurious',
    description: 'Warm paper, crayon colors and a curious owl.',
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

/** Read the currently active theme id from <html data-theme>. */
export function getActiveTheme(): ThemeId {
  return 'kurious'
}

/** Look up a theme entry by id, or fall back to the first theme. */
export function getTheme(id: string) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
