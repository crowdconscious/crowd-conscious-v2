/**
 * Visor de simulación — Divergence Index (Task 1, viewer-facing API).
 *
 * Pure function. Formula (prompt pack Task 1):
 *   shareScore = total variation distance of option shares × 100   (0–100)
 *   confScore  = mean(|sim.conf − real.conf|) / 9 × 100            (0–100)
 *   index      = clamp(0.6 × shareScore + 0.4 × confScore, 0, 100)
 *
 * Total variation distance = ½ Σ |share_a − share_b| over the union of options
 * (shares in 0–1). Confidence scale is 1–10 so the max gap is 9.
 *
 * 0 = identical distributions. 100 = maximally divergent on both components.
 *
 * NOTE: The B-pipeline already has `lib/simulation/divergence.ts` which takes
 * label-keyed AggregateSnapshot maps and returns { id, delta_shares, … }.
 * That stays for the live calibration path. This module is the OptionAgg[]
 * contract Task 2/3 and the seed fixture use — same math, viewer-shaped I/O.
 */

import type { DivergenceScores, OptionAgg } from '../types/simulation.ts'

const WEIGHT_SHARE = 0.6
const WEIGHT_CONF = 0.4
const CONFIDENCE_RANGE = 9

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

function finiteOrZero(n: number | undefined): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

/**
 * Compute the Divergence Index between simulated and real option aggregates.
 *
 * @param sim  simulated panel aggregates (optionId → share 0–1, meanConfidence 1–10)
 * @param real real citizen aggregates (same shape)
 */
export function computeDivergence(
  sim: OptionAgg[],
  real: OptionAgg[],
): DivergenceScores {
  const simById = new Map(sim.map((o) => [o.optionId, o]))
  const realById = new Map(real.map((o) => [o.optionId, o]))

  const optionIds: string[] = []
  const seen = new Set<string>()
  for (const o of real) {
    if (!seen.has(o.optionId)) {
      seen.add(o.optionId)
      optionIds.push(o.optionId)
    }
  }
  for (const o of sim) {
    if (!seen.has(o.optionId)) {
      seen.add(o.optionId)
      optionIds.push(o.optionId)
    }
  }

  let shareAbsSum = 0
  let confAbsSum = 0
  let confBothCount = 0

  for (const id of optionIds) {
    const s = simById.get(id)
    const r = realById.get(id)
    const simShare = finiteOrZero(s?.share)
    const realShare = finiteOrZero(r?.share)
    shareAbsSum += Math.abs(simShare - realShare)

    const simConf = s?.meanConfidence
    const realConf = r?.meanConfidence
    if (
      typeof simConf === 'number' &&
      Number.isFinite(simConf) &&
      typeof realConf === 'number' &&
      Number.isFinite(realConf)
    ) {
      confAbsSum += Math.abs(simConf - realConf)
      confBothCount += 1
    }
  }

  // TV distance in 0–1, then ×100 → shareScore 0–100
  const tvDistance = 0.5 * shareAbsSum
  const shareScore = clamp01to100(tvDistance * 100)

  // mean |Δconf| / 9 in 0–1, then ×100 → confScore 0–100
  const confNorm =
    confBothCount === 0 ? 0 : confAbsSum / confBothCount / CONFIDENCE_RANGE
  const confScore = clamp01to100(confNorm * 100)

  const index = clamp01to100(WEIGHT_SHARE * shareScore + WEIGHT_CONF * confScore)

  return { index, shareScore, confScore }
}
