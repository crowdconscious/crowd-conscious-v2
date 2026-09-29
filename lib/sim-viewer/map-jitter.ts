/**
 * Deterministic map jitter for co-located AGEB agents (Task 4b).
 *
 * Same seed → same offset across renders / mode switches. Offset is a tiny
 * geographic nudge around the persona centroid (well under typical AGEB
 * extent) so dots stay distinguishable without inventing new locations.
 */

import { createSeededRng } from './prng.ts'

/**
 * Max half-extent of the jitter box in degrees (~±35 m at CDMX latitude).
 * Kept small so the point remains visually inside its AGEB.
 */
export const MAP_JITTER_HALF_DEG = 0.00032

export type MapJitterOffset = {
  dLat: number
  dLng: number
}

/** Seeded offset in degrees. Stable for a given seed string. */
export function deterministicMapOffset(seed: string): MapJitterOffset {
  const rng = createSeededRng(`map-jitter:${seed}`)
  return {
    dLat: rng.nextFloat(-MAP_JITTER_HALF_DEG, MAP_JITTER_HALF_DEG),
    dLng: rng.nextFloat(-MAP_JITTER_HALF_DEG, MAP_JITTER_HALF_DEG),
  }
}

/**
 * Apply deterministic jitter to a centroid.
 * Prefer personaKey (+ optional runId) so capture mode stays byte-stable.
 */
export function jitteredMapPoint(
  seed: string,
  centroidLat: number,
  centroidLng: number,
): { lat: number; lng: number } {
  const { dLat, dLng } = deterministicMapOffset(seed)
  return {
    lat: centroidLat + dLat,
    lng: centroidLng + dLng,
  }
}

/** Canonical seed for a vote row on the map. */
export function mapDotSeed(
  runId: string,
  personaKey: string,
  sequenceIndex: number,
): string {
  return `${runId}:${personaKey}:${sequenceIndex}`
}
