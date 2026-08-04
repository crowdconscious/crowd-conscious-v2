/**
 * Divergence Index — "¿La IA nos conoce?" (§5.6).
 *
 * Compares a REAL Pulse's aggregates against a SIMULATED run's aggregates and
 * returns a single 0–100 score plus its two components. Read of the score:
 *   0   = la IA nos leyó perfecto (real ≈ sim)
 *   100 = no nos conoce en absoluto (real vs sim maximally apart)
 *
 * Formula (verbatim §5.6):
 *   ID          = 100 × (0.6 × Δshares + 0.4 × Δconfidence)
 *   Δshares     = ½ Σ |real_share(o) − sim_share(o)|   (total variation distance,
 *                                                        0–1, over the UNION of options)
 *   Δconfidence = mean(|real_conf(o) − sim_conf(o)|) / 9  (normalized 0–1, over the
 *                                                          options present in BOTH sides)
 *
 * Both inputs use the same shape the pipeline stores on `simulation_runs.aggregates`
 * (§5.1/§5.5): `option_shares` (option → share in 0–1) and `avg_confidence_by_option`
 * (option → average confidence in 1–10). The REAL side is built by the caller from
 * `lib/pulse-vote-aggregates.ts` (outcome count / total for shares,
 * `outcomeAvgConfidence` for the confidence map) so the real and simulated numbers
 * are computed identically — otherwise the comparison is invalid (§1.5).
 *
 * Pure and deterministic: no I/O, no clock, no randomness.
 */

/**
 * The subset of a run's aggregates that divergence needs. Aligns with the
 * `aggregates` jsonb documented for `simulation_runs` (§5.1/§5.5): the same
 * `option_shares` / `avg_confidence_by_option` keys the pipeline writes, so the
 * real snapshot and the simulated snapshot are the identical shape.
 */
export interface AggregateSnapshot {
  /** option label → share of the vote in 0–1. Options not present count as 0. */
  option_shares: Readonly<Record<string, number>>;
  /**
   * option label → average confidence in 1–10. An option may be absent here even
   * when present in `option_shares` (e.g. every vote for it lacked a valid
   * confidence); such options are excluded from Δconfidence.
   */
  avg_confidence_by_option: Readonly<Record<string, number>>;
}

/** Per-option breakdown, one row per option in the UNION of the two share maps. */
export interface DivergencePerOption {
  option: string;
  /** Real share in 0–1 (0 when the option is absent on the real side). */
  real_share: number;
  /** Simulated share in 0–1 (0 when the option is absent on the sim side). */
  sim_share: number;
  /** |real_share − sim_share|; its half-sum across options is Δshares. */
  share_abs_diff: number;
  /** Real average confidence 1–10, or null when the option has no real confidence. */
  real_confidence: number | null;
  /** Simulated average confidence 1–10, or null when the option has no sim confidence. */
  sim_confidence: number | null;
  /**
   * |real_conf − sim_conf| when the option has a confidence on BOTH sides, else
   * null. The mean of the non-null values, divided by 9, is Δconfidence.
   */
  confidence_abs_diff: number | null;
  /** True when the option contributes to Δconfidence (confidence on both sides). */
  in_both_confidence: boolean;
}

export interface DivergenceResult {
  /** The Divergence Index, 0–100. */
  id: number;
  /** Total variation distance of the share distributions, 0–1. */
  delta_shares: number;
  /** Normalized mean confidence gap, 0–1. */
  delta_confidence: number;
  per_option: DivergencePerOption[];
}

/** Confidence scale is 1–10, so the maximum possible gap is 9 (§5.6 divisor). */
const CONFIDENCE_RANGE = 9;
const WEIGHT_SHARES = 0.6;
const WEIGHT_CONFIDENCE = 0.4;

/**
 * Compute the Divergence Index between a real and a simulated aggregate snapshot.
 *
 * Edge cases (all deterministic):
 * - Option present on only one side: it still appears in the share union with the
 *   missing side treated as 0, so it contributes to Δshares. It contributes to
 *   Δconfidence only when a confidence exists on BOTH sides.
 * - No options present on both sides (disjoint, or one/both empty): Δconfidence is
 *   0 (there is nothing to average — we guard the divide-by-zero rather than
 *   returning NaN).
 * - Empty inputs on both sides: everything is 0 → id 0.
 * - Shares that don't sum to 1: we TRUST the caller's shares and do NOT renormalize
 *   (the canonical aggregates already encode the intended proportions). Only the
 *   confidence mean is guarded against division by zero.
 *
 * @param real the real Pulse aggregates (built from `lib/pulse-vote-aggregates.ts`)
 * @param sim  the simulated run aggregates (`simulation_runs.aggregates`)
 */
export function computeDivergence(
  real: AggregateSnapshot,
  sim: AggregateSnapshot,
): DivergenceResult {
  const optionUnion = unionKeys(real.option_shares, sim.option_shares);

  const perOption: DivergencePerOption[] = [];
  let shareAbsSum = 0;
  let confidenceAbsSum = 0;
  let confidenceBothCount = 0;

  for (const option of optionUnion) {
    const realShare = numberOrZero(real.option_shares[option]);
    const simShare = numberOrZero(sim.option_shares[option]);
    const shareAbsDiff = Math.abs(realShare - simShare);
    shareAbsSum += shareAbsDiff;

    const realConf = finiteOrNull(real.avg_confidence_by_option[option]);
    const simConf = finiteOrNull(sim.avg_confidence_by_option[option]);
    const inBothConfidence = realConf !== null && simConf !== null;

    let confidenceAbsDiff: number | null = null;
    if (inBothConfidence) {
      confidenceAbsDiff = Math.abs(realConf - simConf);
      confidenceAbsSum += confidenceAbsDiff;
      confidenceBothCount += 1;
    }

    perOption.push({
      option,
      real_share: realShare,
      sim_share: simShare,
      share_abs_diff: shareAbsDiff,
      real_confidence: realConf,
      sim_confidence: simConf,
      confidence_abs_diff: confidenceAbsDiff,
      in_both_confidence: inBothConfidence,
    });
  }

  const deltaShares = 0.5 * shareAbsSum;
  const deltaConfidence =
    confidenceBothCount === 0
      ? 0
      : confidenceAbsSum / confidenceBothCount / CONFIDENCE_RANGE;

  const id =
    100 * (WEIGHT_SHARES * deltaShares + WEIGHT_CONFIDENCE * deltaConfidence);

  return {
    id,
    delta_shares: deltaShares,
    delta_confidence: deltaConfidence,
    per_option: perOption,
  };
}

/** Union of the keys of two records, in first-seen order (real side first). */
function unionKeys(
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of Object.keys(a)) {
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  for (const key of Object.keys(b)) {
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/** A finite number, or 0 for missing / non-finite share values. */
function numberOrZero(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** A finite number, or null for missing / non-finite confidence values. */
function finiteOrNull(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
