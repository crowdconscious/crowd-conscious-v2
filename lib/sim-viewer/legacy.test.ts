import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  assignLegacySequenceIndices,
  buildOptionLabelIndex,
  DIVERGENCE_UNAVAILABLE_HINT,
  householdSizeFromText,
  LEGACY_PERSONA_BASIS_LINE,
  normalizeLabelKey,
  normalizeNseBand,
  parseDivergenceMeta,
  resolveOptionId,
} from './legacy.ts'

test('normalizeLabelKey strips accents and case', () => {
  assert.equal(normalizeLabelKey('Niños'), 'ninos')
  assert.equal(normalizeLabelKey('  Espacio Público '), 'espacio publico')
})

test('label index resolves accent-insensitive matches', () => {
  const index = buildOptionLabelIndex([
    { id: '1', label: 'Más áreas verdes' },
    { id: '2', label: 'Seguridad' },
  ])
  assert.equal(
    resolveOptionId({ option_id: null, option_chosen: 'mas areas verdes' }, index),
    '1',
  )
  assert.equal(
    resolveOptionId({ option_id: null, option_chosen: 'SEGURIDAD' }, index),
    '2',
  )
})

test('seeded sequence assignment is stable and covers 0..n-1', () => {
  const seq = assignLegacySequenceIndices([null, null, null], 'seed-x')
  assert.deepEqual(seq, assignLegacySequenceIndices([null, null, null], 'seed-x'))
  assert.deepEqual([...seq].sort((a, b) => a - b), [0, 1, 2])
})

test('legacy persona helpers', () => {
  assert.equal(normalizeNseBand('D/E'), 'D')
  assert.equal(householdSizeFromText('Vive solo en un depto'), 1)
  assert.equal(householdSizeFromText('texto sin número claro'), null)
  assert.ok(LEGACY_PERSONA_BASIS_LINE.includes('INEGI'))
})

test('legacy divergence jsonb maps to viewer meta', () => {
  const meta = parseDivergenceMeta({
    id: 18,
    delta_shares: 0.1,
    delta_confidence: 0.2,
    per_option: [],
    computed_at: '2026-03-01T00:00:00.000Z',
  })
  assert.deepEqual(meta, {
    index: 18,
    shareScore: 10,
    confScore: 20,
    computedAt: '2026-03-01T00:00:00.000Z',
  })
})

test('parseDivergenceMeta returns null for missing / partial legacy rows', () => {
  assert.equal(parseDivergenceMeta(null), null)
  assert.equal(parseDivergenceMeta(undefined), null)
  assert.equal(parseDivergenceMeta({}), null)
  // id alone (including 0) without deltas is not a computed score
  assert.equal(parseDivergenceMeta({ id: 0 }), null)
  assert.equal(
    parseDivergenceMeta({
      id: 0,
      delta_shares: 0,
      // missing delta_confidence + computed_at
    }),
    null,
  )
  assert.equal(
    parseDivergenceMeta({
      id: 'not-a-number',
      delta_shares: 0.1,
      delta_confidence: 0.1,
      computed_at: '2026-01-01T00:00:00.000Z',
    }),
    null,
  )
})

test('parseDivergenceMeta keeps a genuine computed 0', () => {
  const meta = parseDivergenceMeta({
    id: 0,
    delta_shares: 0,
    delta_confidence: 0,
    per_option: [],
    computed_at: '2026-03-01T00:00:00.000Z',
  })
  assert.deepEqual(meta, {
    index: 0,
    shareScore: 0,
    confScore: 0,
    computedAt: '2026-03-01T00:00:00.000Z',
  })
})

test('DIVERGENCE_UNAVAILABLE_HINT is Spanish copy', () => {
  assert.match(DIVERGENCE_UNAVAILABLE_HINT, /Sin índice/)
  assert.match(DIVERGENCE_UNAVAILABLE_HINT, /votos reales/)
})
