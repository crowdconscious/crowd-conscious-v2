/**
 * Option → dot colour for Mapa mode.
 *
 * Column view uses spatial columns + amber discs; the map has no columns, so
 * each option gets a distinct fill while keeping the amber border / glow of
 * the simulated visual language.
 *
 * PDF report bars + map legend MUST use the same palette so colour encodes
 * the chosen option consistently across the document.
 */

/** Opaque RGB companions of OPTION_FILLS (for jsPDF / print). */
export const OPTION_FILL_RGB: ReadonlyArray<readonly [number, number, number]> = [
  [251, 191, 36], // amber
  [52, 211, 153], // emerald
  [96, 165, 250], // blue
  [244, 114, 182], // pink
  [167, 139, 250], // violet
  [251, 146, 60], // orange
]

/** Fills aligned with the amber SIMULACIÓN palette + readable distinctions. */
const OPTION_FILLS = [
  'rgba(251, 191, 36, 0.92)', // amber
  'rgba(52, 211, 153, 0.88)', // emerald
  'rgba(96, 165, 250, 0.88)', // blue
  'rgba(244, 114, 182, 0.88)', // pink
  'rgba(167, 139, 250, 0.88)', // violet
  'rgba(251, 146, 60, 0.88)', // orange
] as const

const NEUTRAL_STROKE = 'rgba(252, 211, 77, 0.55)'
const NEUTRAL_FILL = 'transparent'

export function optionDotFill(optionIndex: number): string {
  if (optionIndex < 0) return OPTION_FILLS[0]!
  return OPTION_FILLS[optionIndex % OPTION_FILLS.length]!
}

export function optionFillRgb(
  optionIndex: number,
): readonly [number, number, number] {
  if (optionIndex < 0) return OPTION_FILL_RGB[0]!
  return OPTION_FILL_RGB[optionIndex % OPTION_FILL_RGB.length]!
}

export function neutralDotStyle(): { fill: string; stroke: string } {
  return { fill: NEUTRAL_FILL, stroke: NEUTRAL_STROKE }
}

export function votedDotStyle(optionIndex: number): {
  fill: string
  stroke: string
} {
  return {
    fill: optionDotFill(optionIndex),
    stroke: 'rgba(254, 243, 199, 0.95)',
  }
}
