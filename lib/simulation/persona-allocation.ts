/**
 * Deterministic largest-remainder (Hamilton) allocator for persona targets.
 *
 * Context (§5.3 persona library): `data/persona-targets.cdmx-v1.json` stores a
 * `count` per demographic cell, but that number is the OWNER'S PROPORTIONAL
 * WEIGHT (an estimated adult population), NOT a final persona count. The
 * `cdmx-v1` set is defined as exactly N=150 personas (100 Cuauhtémoc +
 * 50 Miguel Hidalgo). This module is where the 100/50/150 correctness guarantee
 * lives — in deterministic, tested code rather than in the hand-edited data file.
 *
 * The future generator (`scripts/generate-personas.ts`, §5.3) will import
 * `allocatePersonaCounts` so persona materialization always hits the 100/50/150
 * contract regardless of how the raw weights drift.
 */

/** Minimum shape an input cell must have. Extra §5.3 fields pass through. */
export interface WeightedCell {
  /** Alcaldía key; must match a key in the `targets` map to receive personas. */
  alcaldia: string;
  /** Proportional weight (owner's population estimate), not a final count. */
  count: number;
}

/** Map of alcaldía → integer number of personas to allocate for that alcaldía. */
export type AllocationTargets = Readonly<Record<string, number>>;

/** Input cell plus the deterministically allocated integer persona count. */
export type AllocatedCell<T extends WeightedCell> = T & {
  /**
   * Integer number of personas for this cell. Added as a NEW field so the
   * source `count` weight is preserved untouched.
   */
  personaCount: number;
};

/**
 * Normalize cell weights to integer persona counts using the largest-remainder
 * (Hamilton) method, allocated PER ALCALDÍA independently so each alcaldía's
 * `personaCount`s sum EXACTLY to its target N.
 *
 * Determinism & exactness:
 * - Uses integer/BigInt arithmetic for the base quota and the fractional
 *   remainder, so there is no floating-point drift: the returned integers sum to
 *   exactly N by construction.
 * - Weights are treated as non-negative integers. Fractional weights are floored
 *   and negative / non-finite weights are treated as 0 (documented coercion; the
 *   §5.3 schema guarantees integers, this is only a safety net).
 * - Remainder ties are broken by original cell order (the earliest cell in the
 *   input array wins). This is a stable, documented key, so the same input always
 *   yields byte-for-byte identical output.
 *
 * Edge cases:
 * - Zero total weight for an alcaldía: N is distributed AS EVENLY AS POSSIBLE
 *   across that alcaldía's cells (floor(N / k) each, the leftover N mod k units
 *   going to the earliest cells). Chosen over all-zeros so the set size is still
 *   honored when the owner leaves weights blank.
 * - Target with no cells: nothing to allocate (the units are simply not placed).
 * - N = 0 (or negative, coerced to 0): every cell in that alcaldía gets 0.
 * - Target larger/smaller than the number of cells: handled naturally — cells may
 *   receive more than one persona, or zero.
 * - Cells whose `alcaldia` is absent from `targets`: every such cell gets 0.
 *
 * @returns the input cells, in their original order, each with a `personaCount`.
 */
export function allocatePersonaCounts<T extends WeightedCell>(
  cells: readonly T[],
  targets: AllocationTargets,
): AllocatedCell<T>[] {
  // personaCount by original index, so we can rebuild output in input order.
  const allocationByIndex = new Array<number>(cells.length).fill(0);

  // Group original indices by alcaldía, preserving input order within a group.
  const indicesByAlcaldia = new Map<string, number[]>();
  for (let i = 0; i < cells.length; i++) {
    const key = cells[i].alcaldia;
    const bucket = indicesByAlcaldia.get(key);
    if (bucket) bucket.push(i);
    else indicesByAlcaldia.set(key, [i]);
  }

  for (const [alcaldia, indices] of indicesByAlcaldia) {
    const target = normalizeTarget(targets[alcaldia]);
    const groupAllocation = allocateGroup(
      indices.map((i) => normalizeWeight(cells[i].count)),
      target,
    );
    for (let g = 0; g < indices.length; g++) {
      allocationByIndex[indices[g]] = groupAllocation[g];
    }
  }

  return cells.map((cell, i) => ({ ...cell, personaCount: allocationByIndex[i] }));
}

/** Largest-remainder allocation of `target` units across `weights`. */
function allocateGroup(weights: number[], target: number): number[] {
  const k = weights.length;
  const result = new Array<number>(k).fill(0);
  if (k === 0 || target <= 0) return result;

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Zero total weight → distribute evenly, leftover to earliest cells.
  if (totalWeight === 0) {
    const base = Math.floor(target / k);
    let leftover = target - base * k;
    for (let i = 0; i < k; i++) {
      result[i] = base + (leftover > 0 ? 1 : 0);
      if (leftover > 0) leftover--;
    }
    return result;
  }

  // Exact integer Hamilton method (BigInt for the floor division / remainder so
  // there is no float-boundary misassignment and no drift in the final sum).
  const N = BigInt(target);
  const S = BigInt(totalWeight);
  let allocated = 0;
  // remainder for ranking = (weight * N) mod S, kept as an integer.
  const remainders: { index: number; remainder: bigint }[] = [];
  for (let i = 0; i < k; i++) {
    const numerator = BigInt(weights[i]) * N;
    const base = Number(numerator / S);
    result[i] = base;
    allocated += base;
    remainders.push({ index: i, remainder: numerator % S });
  }

  // Distribute the remaining units to the largest remainders; ties → earliest.
  let remaining = target - allocated;
  if (remaining > 0) {
    remainders.sort((a, b) => {
      if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
      return a.index - b.index;
    });
    for (let r = 0; r < remaining; r++) {
      result[remainders[r].index] += 1;
    }
  }

  return result;
}

/** Coerce a raw target to a non-negative integer (safety net; schema is int). */
function normalizeTarget(target: number | undefined): number {
  if (typeof target !== "number" || !Number.isFinite(target) || target <= 0) {
    return 0;
  }
  return Math.floor(target);
}

/** Coerce a raw weight to a non-negative integer (safety net; schema is int). */
function normalizeWeight(weight: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  return Math.floor(weight);
}
