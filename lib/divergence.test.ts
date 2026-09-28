import { test } from 'node:test'
import assert from 'node:assert/strict'

import { computeDivergence } from './divergence.ts'
import type { OptionAgg } from '../types/simulation.ts'

function approx(actual: number, expected: number, msg?: string): void {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${msg ?? 'approx'}: expected ${expected}, got ${actual}`,
  )
}

function agg(
  optionId: string,
  share: number,
  meanConfidence: number,
  count = 0,
): OptionAgg {
  return { optionId, share, meanConfidence, count }
}

test('identical distributions → index 0, shareScore 0, confScore 0', () => {
  const side = [
    agg('a', 0.6, 7, 60),
    agg('b', 0.4, 5, 40),
  ]
  const out = computeDivergence(side, side)
  assert.equal(out.index, 0)
  assert.equal(out.shareScore, 0)
  assert.equal(out.confScore, 0)
})

test('maximally divergent shares (no shared conf) → shareScore 100, index 60', () => {
  // real all-A, sim all-B. TV = 1 → shareScore 100. No option on both sides
  // with confidence → confScore 0. index = 0.6*100 + 0.4*0 = 60.
  const real = [agg('a', 1, 9, 100)]
  const sim = [agg('b', 1, 2, 100)]
  const out = computeDivergence(sim, real)
  approx(out.shareScore, 100)
  assert.equal(out.confScore, 0)
  approx(out.index, 60)
})

test('maximally divergent shares + confidence → index 100', () => {
  // shares: real {a:1}, sim {b:1} → TV 1 → shareScore 100
  // To also max confidence we need an option present on BOTH sides with a
  // 9-point gap. Use a third shared option with share 0 on both? Better:
  // binary flip with full conf gap on both options.
  // shares: real {a:0.5,b:0.5}, sim {a:0.5,b:0.5} → shareScore 0 — not max.
  // shares: real {a:1,b:0}, sim {a:0,b:1} with both listed:
  const real = [agg('a', 1, 10, 100), agg('b', 0, 1, 0)]
  const sim = [agg('a', 0, 1, 0), agg('b', 1, 10, 100)]
  // TV: |1-0|+|0-1|=2 → ½·2=1 → shareScore 100
  // conf: |10-1| + |1-10| = 18, mean 9, /9 = 1 → confScore 100
  // index = 0.6*100 + 0.4*100 = 100
  const out = computeDivergence(sim, real)
  approx(out.shareScore, 100)
  approx(out.confScore, 100)
  approx(out.index, 100)
})

test('hand-computed fixture: shareScore 50, confScore 100 → index 70', () => {
  // shares: real {a:0.75,b:0.25}, sim {a:0.25,b:0.75}
  //   Σ|Δ| = 1.0 → TV 0.5 → shareScore 50
  // conf: real {a:10,b:1}, sim {a:1,b:10}
  //   mean |Δ| = 9 → /9 = 1 → confScore 100
  // index = 0.6*50 + 0.4*100 = 30 + 40 = 70
  const real = [agg('a', 0.75, 10, 75), agg('b', 0.25, 1, 25)]
  const sim = [agg('a', 0.25, 1, 25), agg('b', 0.75, 10, 75)]
  const out = computeDivergence(sim, real)
  approx(out.shareScore, 50)
  approx(out.confScore, 100)
  approx(out.index, 70)
})

test('empty inputs → all zeros', () => {
  const out = computeDivergence([], [])
  assert.equal(out.index, 0)
  assert.equal(out.shareScore, 0)
  assert.equal(out.confScore, 0)
})

test('scores are clamped to 0–100', () => {
  // Pathological shares summing well over 1 on opposite sides.
  const real = [agg('a', 2, 10, 1)]
  const sim = [agg('a', -1, 1, 1)]
  const out = computeDivergence(sim, real)
  assert.ok(out.shareScore <= 100)
  assert.ok(out.shareScore >= 0)
  assert.ok(out.confScore <= 100)
  assert.ok(out.index <= 100)
  assert.ok(out.index >= 0)
})
