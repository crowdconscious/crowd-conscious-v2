/**
 * Capture-mode determinism: two independent "runs" seeded from the same
 * run id must produce identical jitter / lattice layouts. Verifies the
 * review checklist item "Capture mode is deterministic across two runs".
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createSeededRng } from './prng.ts'
import { computeAgentPositions } from './positions.ts'

const RUN_ID = 'fixture-run-00000000-0000-4000-8000-000000000001'

test('two runs seeded from the same run id produce identical layouts', () => {
  const runA = computeAgentPositions(RUN_ID, 150)
  const runB = computeAgentPositions(RUN_ID, 150)
  assert.deepEqual(runA, runB)
})

test('two independent PRNG streams from the same seed match byte-for-byte', () => {
  const stream = (label: string) => {
    const rng = createSeededRng(`${RUN_ID}:${label}`)
    return Array.from({ length: 64 }, () => rng.next())
  }
  assert.deepEqual(stream('layout'), stream('layout'))
  assert.deepEqual(stream('jitter'), stream('jitter'))
  // Different labels must diverge so we are not accidentally constant.
  assert.notDeepEqual(stream('layout'), stream('jitter'))
})

test('different run ids diverge (sanity)', () => {
  const a = computeAgentPositions('run-aaa', 20)
  const b = computeAgentPositions('run-bbb', 20)
  assert.notDeepEqual(a, b)
})
