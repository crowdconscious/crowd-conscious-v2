import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatDivergence,
  roundDivergence,
} from './format-divergence.ts'

test('formatDivergence rounds halves away from zero via Math.round', () => {
  assert.equal(formatDivergence(59.1045), '59')
  assert.equal(formatDivergence(59.5), '60')
  assert.equal(formatDivergence(0), '0')
})

test('formatDivergence uses em dash for missing / non-finite', () => {
  assert.equal(formatDivergence(null), '—')
  assert.equal(formatDivergence(undefined), '—')
  assert.equal(formatDivergence(Number.NaN), '—')
  assert.equal(formatDivergence(Number.POSITIVE_INFINITY), '—')
})

test('roundDivergence mirrors formatDivergence numerically', () => {
  assert.equal(roundDivergence(59.1045), 59)
  assert.equal(roundDivergence(59.5), 60)
  assert.equal(roundDivergence(0), 0)
  assert.equal(roundDivergence(null), null)
  assert.equal(roundDivergence(Number.NaN), null)
})
