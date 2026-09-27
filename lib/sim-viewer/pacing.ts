/**
 * Capture-mode pacing (Task 6).
 *
 * "Cinemático" is not a flat speed multiplier: the first agents land slowly,
 * the middle accelerates, and settle holds 1.5s before the reveal so the climax
 * can breathe. Pure functions so tests can assert timing without a DOM.
 */

export type CinematicPhase = 'opening' | 'middle' | 'closing'

/** Agents that land at the slower opening cadence. */
export const CINEMATIC_OPENING_COUNT = 15

/** Base vote interval at 1× (ms). Match the playback hook. */
export const BASE_VOTE_INTERVAL_MS = 70

/** Settle duration at 1× / 2× / 4×. */
export const BASE_SETTLE_MS = 900

/** Extra hold before reveal when speed is cinemático (spec: 1.5s). */
export const CINEMATIC_PRE_REVEAL_HOLD_MS = 1500

/** Endcard hold after divergence resolves (spec: 3s). */
export const ENDCARD_HOLD_MS = 3000

/** Populate pause at the start of a run. */
export const BASE_POPULATE_MS = 1200

/** Divergence count-up duration. */
export const BASE_REVEAL_COUNT_MS = 1600

/**
 * Effective speed multiplier for a given vote index under cinemático pacing.
 * Opening (~first 15): ~0.55×  Middle: ~1.35×  Closing (last 10): ~0.85×
 */
export function cinematicSpeedAt(voteIndex: number, total: number): number {
  if (total <= 0) return 1
  if (voteIndex < CINEMATIC_OPENING_COUNT) return 0.55
  if (voteIndex >= Math.max(CINEMATIC_OPENING_COUNT, total - 10)) return 0.85
  return 1.35
}

export function cinematicPhaseAt(voteIndex: number, total: number): CinematicPhase {
  if (voteIndex < CINEMATIC_OPENING_COUNT) return 'opening'
  if (voteIndex >= Math.max(CINEMATIC_OPENING_COUNT, total - 10)) return 'closing'
  return 'middle'
}

/**
 * Settle duration before reveal. Cinemático adds the deliberate 1.5s hold
 * on top of the base settle so percentages can resolve, then breathe.
 */
export function settleDurationMs(speed: 1 | 2 | 4 | 'cinematic'): number {
  if (speed === 'cinematic') {
    return BASE_SETTLE_MS + CINEMATIC_PRE_REVEAL_HOLD_MS
  }
  return BASE_SETTLE_MS
}

/**
 * Convert a wall-clock delta into effective playback-ms for the clock.
 * For numeric speeds this is a flat multiply; for cinemático it depends on
 * the current vote index during the vote beat.
 */
export function effectiveDeltaMs(
  wallDeltaMs: number,
  speed: 1 | 2 | 4 | 'cinematic',
  voteIndex: number,
  total: number,
  beat: string
): number {
  if (speed !== 'cinematic') {
    return wallDeltaMs * speed
  }
  if (beat === 'vote') {
    return wallDeltaMs * cinematicSpeedAt(voteIndex, total)
  }
  // Outside the vote beat, cinemático runs near 1× so holds stay readable.
  return wallDeltaMs * 1
}
