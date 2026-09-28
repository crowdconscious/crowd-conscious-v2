/**
 * Deterministic layout helpers for the column view.
 * Lattice (Beat 1) and per-column jitter (Beat 2) are seeded from the run id.
 */

import { createSeededRng } from './prng.ts'

export type AgentDotPosition = {
  /** Lattice slot while waiting to vote (0..n-1). */
  latticeIndex: number
  /** Normalized lattice x/y in [0,1] within the waiting bay. */
  latticeX: number
  latticeY: number
  /** Horizontal jitter within the chosen option column, in [-0.5, 0.5]. */
  columnJitter: number
}

const LATTICE_COLS = 10

export function computeAgentPositions(
  runId: string,
  voteCount: number
): AgentDotPosition[] {
  const rng = createSeededRng(`${runId}:layout`)
  const rows = Math.ceil(voteCount / LATTICE_COLS)

  return Array.from({ length: voteCount }, (_, i) => {
    const col = i % LATTICE_COLS
    const row = Math.floor(i / LATTICE_COLS)
    return {
      latticeIndex: i,
      latticeX: (col + 0.5) / LATTICE_COLS,
      latticeY: rows <= 1 ? 0.5 : (row + 0.5) / rows,
      columnJitter: rng.nextFloat(-0.42, 0.42),
    }
  })
}

/** Map confidence 1–10 → CSS top fraction (0 = top, 1 = bottom). 10 near top. */
export function confidenceToTopFraction(confidence: number): number {
  const c = Math.min(10, Math.max(1, confidence))
  const raw = 1 - (c - 1) / 9
  return 0.06 + raw * 0.88
}
