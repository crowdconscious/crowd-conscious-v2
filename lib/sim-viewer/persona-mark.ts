/**
 * Abstract persona mark helpers + grounding copy (Prompt Pack Task 5).
 * Pure — safe for node:test and shared by the inspector UI.
 */

/** Spec grounding line — keep verbatim (Prompt Pack Task 5). */
export const PERSONA_GROUNDING_LINE =
  'Persona sintetica generada a partir de marginales del Censo INEGI 2020 a nivel AGEB. No representa a una persona real.'

/** AMAI NSE → fill colour (simulated palette, amber-adjacent). */
export function nseBandColor(nseBand: string | null | undefined): string {
  switch ((nseBand ?? '').trim().toUpperCase()) {
    case 'A/B':
    case 'AB':
      return '#5eead4' // teal
    case 'C+':
      return '#7dd3fc' // sky
    case 'C':
      return '#fbbf24' // amber
    case 'C-':
      return '#fb923c' // orange
    case 'D+':
      return '#f472b6' // pink
    case 'D':
    case 'D/E':
    case 'E':
      return '#c4b5fd' // soft violet (still distinct from real emerald)
    default:
      return '#94a3b8' // slate fallback
  }
}

/**
 * Alcaldía → glyph kind. Miguel Hidalgo = diamond, Cuauhtémoc = hexagon,
 * anything else = rounded square.
 */
export function alcaldiaGlyph(
  alcaldia: string
): 'diamond' | 'hexagon' | 'square' {
  const a = alcaldia.trim().toLowerCase()
  if (a.includes('miguel') || a.includes('hidalgo')) return 'diamond'
  if (a.includes('cuauht')) return 'hexagon'
  return 'square'
}
