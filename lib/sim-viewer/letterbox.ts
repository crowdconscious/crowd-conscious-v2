/**
 * Exact letterbox stage size for capture presets.
 * Given a viewport and target aspect, returns CSS width/height that fill
 * one axis and letterbox the other — frame-accurate for screen recording.
 */

import type { SimulationAspectRatio } from '@/types/simulation-replay'

export const CAPTURE_PRESETS: Record<
  SimulationAspectRatio,
  { width: number; height: number; label: string }
> = {
  '16:9': { width: 1920, height: 1080, label: '16:9 · demos / YouTube' },
  '9:16': { width: 1080, height: 1920, label: '9:16 · Reels / TikTok / Stories' },
  '1:1': { width: 1080, height: 1080, label: '1:1 · feed posts' },
}

export function aspectValue(ratio: SimulationAspectRatio): number {
  const p = CAPTURE_PRESETS[ratio]
  return p.width / p.height
}

/**
 * Compute the largest rectangle of `ratio` that fits in the viewport.
 * Returns pixel dimensions (integers) for deterministic framing.
 */
export function fitLetterbox(
  viewportW: number,
  viewportH: number,
  ratio: SimulationAspectRatio
): { width: number; height: number } {
  const a = aspectValue(ratio)
  if (viewportW <= 0 || viewportH <= 0) {
    const p = CAPTURE_PRESETS[ratio]
    return { width: p.width, height: p.height }
  }
  // Compare viewport aspect to target.
  if (viewportW / viewportH > a) {
    // Viewport is wider — height-constrained
    const height = Math.floor(viewportH)
    const width = Math.floor(height * a)
    return { width, height }
  }
  // Viewport is taller — width-constrained
  const width = Math.floor(viewportW)
  const height = Math.floor(width / a)
  return { width, height }
}
