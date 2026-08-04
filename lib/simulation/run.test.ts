import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeRunAggregates,
  computeAggregateSnapshot,
  selectStratifiedSample,
  personaStratumKey,
  assessRunCost,
  assertCostWithinEnvelope,
  expectedRunCostUsd,
  agentCostUsd,
  CostEnvelopeError,
  COST_ALERT_MULTIPLIER,
  EXPECTED_INPUT_TOKENS_PER_AGENT,
  EXPECTED_OUTPUT_TOKENS_PER_AGENT,
  type ParsedVoteLike,
} from "./run.ts";

/** Float-tolerant equality (the aggregate math chains divisions). */
function approx(actual: number, expected: number, msg?: string): void {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${msg ?? "approx"}: expected ${expected}, got ${actual}`,
  );
}

// --- computeRunAggregates / computeAggregateSnapshot -----------------------

test("computeRunAggregates: shares, avg confidence, weighted shares, completion", () => {
  // A: confidences [8, 6] → count 2, sum 14, avg 7
  // B: confidence  [10]   → count 1, sum 10, avg 10
  // total votes 3; attempted 4 → completion_rate 0.75
  // total confidence 24 → weighted A 14/24, B 10/24
  const votes: ParsedVoteLike[] = [
    { option_chosen: "A", confidence: 8 },
    { option_chosen: "A", confidence: 6 },
    { option_chosen: "B", confidence: 10 },
  ];
  const agg = computeRunAggregates(votes, 4);

  approx(agg.option_shares.A, 2 / 3, "share A");
  approx(agg.option_shares.B, 1 / 3, "share B");
  approx(agg.avg_confidence_by_option.A, 7, "avg conf A");
  approx(agg.avg_confidence_by_option.B, 10, "avg conf B");
  approx(agg.confidence_weighted_shares.A, 14 / 24, "weighted A");
  approx(agg.confidence_weighted_shares.B, 10 / 24, "weighted B");
  approx(agg.completion_rate, 0.75, "completion_rate");
});

test("computeRunAggregates: shares sum to 1 and weighted shares sum to 1", () => {
  const votes: ParsedVoteLike[] = [
    { option_chosen: "Sí", confidence: 9 },
    { option_chosen: "Sí", confidence: 7 },
    { option_chosen: "No", confidence: 4 },
    { option_chosen: "No sé", confidence: 2 },
  ];
  const agg = computeRunAggregates(votes, 4);
  const shareSum = Object.values(agg.option_shares).reduce((s, n) => s + n, 0);
  const weightedSum = Object.values(agg.confidence_weighted_shares).reduce(
    (s, n) => s + n,
    0,
  );
  approx(shareSum, 1, "option_shares sum");
  approx(weightedSum, 1, "confidence_weighted_shares sum");
  approx(agg.completion_rate, 1, "completion_rate all valid");
});

test("computeRunAggregates: completion_rate 0 when nothing attempted / no votes", () => {
  const empty = computeRunAggregates([], 0);
  assert.equal(empty.completion_rate, 0);
  assert.deepEqual(empty.option_shares, {});
  const noneValid = computeRunAggregates([], 10);
  assert.equal(noneValid.completion_rate, 0);
});

test("computeAggregateSnapshot matches the real-side (identical math for both)", () => {
  // The sim path and the real path both funnel through computeAggregateSnapshot,
  // so identical vote multisets must yield identical snapshots.
  const simSnap = computeAggregateSnapshot([
    { outcome_id: "A", confidence: 8, created_at: "1970-01-01T00:00:00.000Z" },
    { outcome_id: "B", confidence: 4, created_at: "1970-01-01T00:00:00.000Z" },
  ]);
  const realSnap = computeAggregateSnapshot([
    { outcome_id: "A", confidence: 8, created_at: "2026-01-01T00:00:00.000Z" },
    { outcome_id: "B", confidence: 4, created_at: "2026-01-01T00:00:00.000Z" },
  ]);
  assert.deepEqual(simSnap.option_shares, realSnap.option_shares);
  assert.deepEqual(
    simSnap.avg_confidence_by_option,
    realSnap.avg_confidence_by_option,
  );
});

test("computeAggregateSnapshot: option with no valid confidence is omitted from the confidence map", () => {
  const snap = computeAggregateSnapshot([
    { outcome_id: "A", confidence: null, created_at: "1970-01-01T00:00:00.000Z" },
    { outcome_id: "B", confidence: 6, created_at: "1970-01-01T00:00:00.000Z" },
  ]);
  // A still appears in shares (a vote was cast) but not in the confidence map.
  approx(snap.option_shares.A, 0.5);
  assert.equal("A" in snap.avg_confidence_by_option, false);
  approx(snap.avg_confidence_by_option.B, 6);
});

// --- selectStratifiedSample ------------------------------------------------

type P = { id: string; alcaldia: string };
const byAlcaldia = (p: P) => p.alcaldia;

function makePool(): P[] {
  const pool: P[] = [];
  for (let i = 0; i < 6; i++) pool.push({ id: `A${i}`, alcaldia: "Cuauhtémoc" });
  for (let i = 0; i < 4; i++) pool.push({ id: `B${i}`, alcaldia: "Miguel Hidalgo" });
  return pool;
}

function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) out[key(it)] = (out[key(it)] ?? 0) + 1;
  return out;
}

test("selectStratifiedSample: preserves proportions (6:4 pool, n=5 → 3:2)", () => {
  const pool = makePool();
  const sample = selectStratifiedSample(pool, 5, byAlcaldia);
  assert.equal(sample.length, 5);
  const counts = countBy(sample, byAlcaldia);
  assert.equal(counts["Cuauhtémoc"], 3);
  assert.equal(counts["Miguel Hidalgo"], 2);
  // Every sampled persona comes from the pool, no duplicates.
  const ids = new Set(sample.map((p) => p.id));
  assert.equal(ids.size, 5);
  for (const p of sample) assert.ok(pool.some((q) => q.id === p.id));
});

test("selectStratifiedSample: deterministic across repeated calls", () => {
  const pool = makePool();
  const first = selectStratifiedSample(pool, 5, byAlcaldia);
  for (let i = 0; i < 5; i++) {
    const again = selectStratifiedSample(pool, 5, byAlcaldia);
    assert.deepEqual(again, first);
  }
});

test("selectStratifiedSample: never oversamples; n>=pool returns the whole pool", () => {
  const pool = makePool();
  assert.equal(selectStratifiedSample(pool, 10, byAlcaldia).length, 10);
  assert.equal(selectStratifiedSample(pool, 999, byAlcaldia).length, 10);
});

test("selectStratifiedSample: non-positive n yields an empty sample", () => {
  const pool = makePool();
  assert.equal(selectStratifiedSample(pool, 0, byAlcaldia).length, 0);
  assert.equal(selectStratifiedSample(pool, -3, byAlcaldia).length, 0);
});

test("selectStratifiedSample: allocation always sums to exactly n", () => {
  // Uneven strata, awkward n — the Hamilton allocator still hits n exactly.
  const pool: P[] = [];
  for (let i = 0; i < 100; i++) pool.push({ id: `A${i}`, alcaldia: "A" });
  for (let i = 0; i < 1; i++) pool.push({ id: `B${i}`, alcaldia: "B" });
  for (let i = 0; i < 49; i++) pool.push({ id: `C${i}`, alcaldia: "C" });
  for (const n of [1, 7, 50, 149]) {
    const sample = selectStratifiedSample(pool, n, byAlcaldia);
    assert.equal(sample.length, n, `n=${n}`);
    // Never takes more from a stratum than it holds.
    const counts = countBy(sample, byAlcaldia);
    assert.ok((counts["A"] ?? 0) <= 100);
    assert.ok((counts["B"] ?? 0) <= 1);
    assert.ok((counts["C"] ?? 0) <= 49);
  }
});

test("personaStratumKey: composite of alcaldía × income × gender × education × age decade", () => {
  const key = personaStratumKey({
    alcaldia: "Cuauhtémoc",
    income_band: "C",
    gender: "femenino",
    education: "licenciatura",
    age: 34,
  });
  assert.equal(key, "Cuauhtémoc|C|femenino|licenciatura|30s");
  // Same demographic cell → same key; a different decade → different key.
  assert.equal(
    personaStratumKey({ alcaldia: "X", income_band: "C", gender: "m", education: "prepa", age: 41 }),
    "X|C|m|prepa|40s",
  );
  // Missing age → "na" bucket, missing fields → empty segments.
  assert.equal(personaStratumKey({ alcaldia: "X" }), "X||||na");
});

// --- cost-envelope guard ---------------------------------------------------

test("cost guard: the §5.5 envelope keeps 200 agents well under $1", () => {
  const cost = expectedRunCostUsd(200, { batch: true });
  assert.ok(cost < 1, `expected 200-agent batch cost < $1, got ${cost}`);
  // Batch is cheaper than synchronous.
  assert.ok(
    expectedRunCostUsd(200, { batch: true }) <
      expectedRunCostUsd(200, { batch: false }),
  );
});

test("cost guard: at-envelope usage is within the envelope (ratio ~1)", () => {
  const nAgents = 200;
  const assessment = assessRunCost({
    nAgents,
    inputTokens: nAgents * EXPECTED_INPUT_TOKENS_PER_AGENT,
    outputTokens: nAgents * EXPECTED_OUTPUT_TOKENS_PER_AGENT,
    batch: true,
  });
  approx(assessment.ratio, 1, "ratio at envelope");
  assert.equal(assessment.withinEnvelope, true);
  // assertCostWithinEnvelope returns the assessment without throwing.
  assert.doesNotThrow(() =>
    assertCostWithinEnvelope({
      nAgents,
      inputTokens: nAgents * EXPECTED_INPUT_TOKENS_PER_AGENT,
      outputTokens: nAgents * EXPECTED_OUTPUT_TOKENS_PER_AGENT,
      batch: true,
    }),
  );
});

test("cost guard: exactly 10× is allowed, just over 10× throws", () => {
  const nAgents = 200;
  const base = {
    nAgents,
    inputTokens: nAgents * EXPECTED_INPUT_TOKENS_PER_AGENT,
    outputTokens: nAgents * EXPECTED_OUTPUT_TOKENS_PER_AGENT,
    batch: true,
  };
  // Exactly at the multiplier: within envelope (<=).
  const atLimit = assessRunCost({
    ...base,
    inputTokens: base.inputTokens * COST_ALERT_MULTIPLIER,
    outputTokens: base.outputTokens * COST_ALERT_MULTIPLIER,
  });
  approx(atLimit.ratio, COST_ALERT_MULTIPLIER, "ratio at limit");
  assert.equal(atLimit.withinEnvelope, true);

  // ~12× the envelope (wrong model / runaway prompt) → STOP and flag (§5.5).
  const runaway = {
    ...base,
    inputTokens: base.inputTokens * 12,
    outputTokens: base.outputTokens * 12,
  };
  assert.equal(assessRunCost(runaway).withinEnvelope, false);
  assert.throws(() => assertCostWithinEnvelope(runaway), CostEnvelopeError);
});

test("cost guard: CostEnvelopeError carries the assessment", () => {
  const nAgents = 200;
  try {
    assertCostWithinEnvelope({
      nAgents,
      inputTokens: nAgents * EXPECTED_INPUT_TOKENS_PER_AGENT * 50,
      outputTokens: nAgents * EXPECTED_OUTPUT_TOKENS_PER_AGENT * 50,
      batch: true,
    });
    assert.fail("expected CostEnvelopeError");
  } catch (err) {
    assert.ok(err instanceof CostEnvelopeError);
    assert.equal(err.assessment.withinEnvelope, false);
    assert.ok(err.assessment.ratio > COST_ALERT_MULTIPLIER);
  }
});

test("agentCostUsd: batch is exactly half the synchronous price", () => {
  const sync = agentCostUsd(1000, 200, { batch: false });
  const batch = agentCostUsd(1000, 200, { batch: true });
  approx(batch, sync * 0.5, "batch discount");
});
