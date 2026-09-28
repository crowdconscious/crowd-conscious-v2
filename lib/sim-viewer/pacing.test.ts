import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CINEMATIC_OPENING_COUNT,
  CINEMATIC_PRE_REVEAL_HOLD_MS,
  ENDCARD_HOLD_MS,
  BASE_SETTLE_MS,
  cinematicPhaseAt,
  cinematicSpeedAt,
  effectiveDeltaMs,
  settleDurationMs,
} from './pacing.ts'

test('cinematicSpeedAt: opening slower than middle', () => {
  const open = cinematicSpeedAt(0, 150)
  const mid = cinematicSpeedAt(40, 150)
  assert.ok(open < mid)
  assert.equal(cinematicPhaseAt(0, 150), 'opening')
  assert.equal(cinematicPhaseAt(40, 150), 'middle')
  assert.equal(cinematicPhaseAt(145, 150), 'closing')
})

test('cinematicSpeedAt: first CINEMATIC_OPENING_COUNT agents are opening', () => {
  for (let i = 0; i < CINEMATIC_OPENING_COUNT; i++) {
    assert.equal(cinematicPhaseAt(i, 150), 'opening')
  }
  assert.equal(cinematicPhaseAt(CINEMATIC_OPENING_COUNT, 150), 'middle')
})

test('settleDurationMs: cinemático includes 1.5s pre-reveal hold', () => {
  assert.equal(settleDurationMs(1), BASE_SETTLE_MS)
  assert.equal(settleDurationMs(4), BASE_SETTLE_MS)
  assert.equal(
    settleDurationMs('cinematic'),
    BASE_SETTLE_MS + CINEMATIC_PRE_REVEAL_HOLD_MS
  )
  assert.equal(CINEMATIC_PRE_REVEAL_HOLD_MS, 1500)
  assert.equal(ENDCARD_HOLD_MS, 3000)
})

test('effectiveDeltaMs: numeric speeds are flat multipliers', () => {
  assert.equal(effectiveDeltaMs(100, 1, 0, 150, 'vote'), 100)
  assert.equal(effectiveDeltaMs(100, 2, 0, 150, 'vote'), 200)
  assert.equal(effectiveDeltaMs(100, 4, 10, 150, 'vote'), 400)
})

test('effectiveDeltaMs: cinemático varies by vote index', () => {
  const open = effectiveDeltaMs(100, 'cinematic', 0, 150, 'vote')
  const mid = effectiveDeltaMs(100, 'cinematic', 40, 150, 'vote')
  assert.ok(open < mid)
  // Outside vote beat, near 1×
  assert.equal(effectiveDeltaMs(100, 'cinematic', 0, 150, 'settle'), 100)
})
