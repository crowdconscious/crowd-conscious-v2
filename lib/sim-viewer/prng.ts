/**
 * Seeded PRNG for the simulation viewer.
 *
 * Capture mode (Task 6) requires byte-identical replays across runs —
 * same jitter, same lattice. Never use Math.random() for viewer geometry.
 * Mulberry32: small, fast, good enough for visual jitter.
 */

export type SeededRng = {
  /** Returns a float in [0, 1). */
  next: () => number
  /** Inclusive integer range. */
  nextInt: (min: number, max: number) => number
  /** Float in [min, max). */
  nextFloat: (min: number, max: number) => number
}

/** Hash a string seed (e.g. run id) into a 32-bit unsigned int. */
export function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function createSeededRng(seed: string | number): SeededRng {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed)

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    nextInt(min: number, max: number): number {
      if (max < min) return min
      return min + Math.floor(next() * (max - min + 1))
    },
    nextFloat(min: number, max: number): number {
      return min + next() * (max - min)
    },
  }
}

/** Fisher–Yates shuffle using a seeded RNG. Mutates a copy. */
export function seededShuffle<T>(items: readonly T[], rng: SeededRng): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i)
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}
