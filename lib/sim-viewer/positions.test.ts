import test from 'node:test'
import assert from 'node:assert/strict'
import { confidenceToTopFraction, computeAgentPositions } from './positions.ts'

test('confidenceToTopFraction: 10 near top, 1 near bottom', () => {
  assert.ok(confidenceToTopFraction(10) < confidenceToTopFraction(1))
  assert.ok(confidenceToTopFraction(10) < 0.2)
  assert.ok(confidenceToTopFraction(1) > 0.8)
})

test('computeAgentPositions is deterministic for a run id', () => {
  const a = computeAgentPositions('run-abc', 150)
  const b = computeAgentPositions('run-abc', 150)
  assert.equal(a.length, 150)
  assert.deepEqual(a, b)
  assert.ok(a.some((p) => p.columnJitter !== 0))
})
