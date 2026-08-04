import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeDivergence,
  type AggregateSnapshot,
} from "./divergence.ts";

/** Float-tolerant equality; the formula chains multiplications so exact === on
 *  doubles is fragile even for clean inputs. 1e-9 is far tighter than any value
 *  the reveal UI renders. */
function approx(actual: number, expected: number, msg?: string): void {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${msg ?? "approx"}: expected ${expected}, got ${actual}`,
  );
}

test("identical inputs → ID 0 and both deltas 0", () => {
  const snap: AggregateSnapshot = {
    option_shares: { A: 0.6, B: 0.4 },
    avg_confidence_by_option: { A: 7, B: 5 },
  };
  const out = computeDivergence(snap, snap);
  assert.equal(out.id, 0);
  assert.equal(out.delta_shares, 0);
  assert.equal(out.delta_confidence, 0);
  for (const row of out.per_option) {
    assert.equal(row.share_abs_diff, 0);
    assert.equal(row.confidence_abs_diff, 0);
    assert.equal(row.in_both_confidence, true);
  }
});

test("fully disjoint distributions → Δshares maxes at 1, ID = 60", () => {
  // real is all-A, sim is all-B. Union {A,B}:
  //   Σ|Δ| = |1-0| + |0-1| = 2  →  Δshares = ½·2 = 1  (the maximum TV distance)
  // No option has confidence on both sides → Δconfidence = 0.
  //   ID = 100·(0.6·1 + 0.4·0) = 60  (the ceiling for the shares component alone)
  const real: AggregateSnapshot = {
    option_shares: { A: 1 },
    avg_confidence_by_option: { A: 9 },
  };
  const sim: AggregateSnapshot = {
    option_shares: { B: 1 },
    avg_confidence_by_option: { B: 2 },
  };
  const out = computeDivergence(real, sim);
  approx(out.delta_shares, 1);
  assert.equal(out.delta_confidence, 0);
  approx(out.id, 60);

  const a = out.per_option.find((r) => r.option === "A")!;
  const b = out.per_option.find((r) => r.option === "B")!;
  assert.equal(a.sim_share, 0);
  assert.equal(b.real_share, 0);
  assert.equal(a.in_both_confidence, false);
  assert.equal(b.confidence_abs_diff, null);
});

test("hand-computed fixture matches (ID = 70)", () => {
  // Binary-exact shares so the arithmetic is clean.
  //   shares: real {A:0.75, B:0.25}, sim {A:0.25, B:0.75}
  //     Σ|Δ| = |0.75-0.25| + |0.25-0.75| = 0.5 + 0.5 = 1.0
  //     Δshares = ½·1.0 = 0.5
  //   confidence: real {A:10, B:1}, sim {A:1, B:10}
  //     |Δ| = 9 for A, 9 for B → mean = 9 → Δconfidence = 9/9 = 1.0
  //   ID = 100·(0.6·0.5 + 0.4·1.0) = 100·(0.3 + 0.4) = 100·0.7 = 70
  const real: AggregateSnapshot = {
    option_shares: { A: 0.75, B: 0.25 },
    avg_confidence_by_option: { A: 10, B: 1 },
  };
  const sim: AggregateSnapshot = {
    option_shares: { A: 0.25, B: 0.75 },
    avg_confidence_by_option: { A: 1, B: 10 },
  };
  const out = computeDivergence(real, sim);
  approx(out.delta_shares, 0.5);
  approx(out.delta_confidence, 1.0);
  approx(out.id, 70);
});

test("confidence normalization: a 9-point gap maps through /9 to 1.0", () => {
  // Shares identical → Δshares 0, isolating the confidence term.
  //   confidence gaps: A |10-1| = 9, B |6-6| = 0 → mean = 4.5 → /9 = 0.5
  //   ID = 100·(0.6·0 + 0.4·0.5) = 20
  const real: AggregateSnapshot = {
    option_shares: { A: 0.5, B: 0.5 },
    avg_confidence_by_option: { A: 10, B: 6 },
  };
  const sim: AggregateSnapshot = {
    option_shares: { A: 0.5, B: 0.5 },
    avg_confidence_by_option: { A: 1, B: 6 },
  };
  const out = computeDivergence(real, sim);
  approx(out.delta_shares, 0);
  approx(out.delta_confidence, 0.5);
  approx(out.id, 20);

  // A full 9-point gap on the only shared-confidence option normalizes to exactly 1.
  const maxConf = computeDivergence(
    { option_shares: { A: 1 }, avg_confidence_by_option: { A: 10 } },
    { option_shares: { A: 1 }, avg_confidence_by_option: { A: 1 } },
  );
  approx(maxConf.delta_confidence, 1.0);
});

test("option present on one side only: contributes to Δshares, excluded from Δconfidence", () => {
  // Union {A,B,C}. C is sim-only.
  //   shares: real {A:0.5,B:0.5}, sim {A:0.5,B:0.25,C:0.25}
  //     |Δ|: A 0, B 0.25, C 0.25 → Σ = 0.5 → Δshares = 0.25
  //   confidence present on both sides only for A and B (C is sim-only):
  //     real {A:8,B:4}, sim {A:8,B:4,C:9} → gaps 0 and 0 → Δconfidence = 0
  const real: AggregateSnapshot = {
    option_shares: { A: 0.5, B: 0.5 },
    avg_confidence_by_option: { A: 8, B: 4 },
  };
  const sim: AggregateSnapshot = {
    option_shares: { A: 0.5, B: 0.25, C: 0.25 },
    avg_confidence_by_option: { A: 8, B: 4, C: 9 },
  };
  const out = computeDivergence(real, sim);
  approx(out.delta_shares, 0.25);
  approx(out.delta_confidence, 0);

  const c = out.per_option.find((r) => r.option === "C")!;
  assert.equal(c.real_share, 0);
  assert.equal(c.sim_share, 0.25);
  assert.equal(c.real_confidence, null);
  assert.equal(c.sim_confidence, 9);
  assert.equal(c.in_both_confidence, false);
  assert.equal(c.confidence_abs_diff, null);
  // Exactly the three union options are present.
  assert.deepEqual(
    out.per_option.map((r) => r.option).sort(),
    ["A", "B", "C"],
  );
});

test("edge: empty inputs → ID 0 and no rows", () => {
  const empty: AggregateSnapshot = {
    option_shares: {},
    avg_confidence_by_option: {},
  };
  const out = computeDivergence(empty, empty);
  assert.equal(out.id, 0);
  assert.equal(out.delta_shares, 0);
  assert.equal(out.delta_confidence, 0);
  assert.equal(out.per_option.length, 0);
});

test("edge: shares are trusted, not renormalized (no divide-by-zero side effects)", () => {
  // Shares deliberately sum to more than 1 on the real side; we use them as given.
  //   real {A:0.7,B:0.7}, sim {A:0.7,B:0.7} → all diffs 0 → Δshares 0, ID 0.
  const snap: AggregateSnapshot = {
    option_shares: { A: 0.7, B: 0.7 },
    avg_confidence_by_option: { A: 5, B: 5 },
  };
  const out = computeDivergence(snap, snap);
  assert.equal(out.delta_shares, 0);
  assert.equal(out.id, 0);
});
