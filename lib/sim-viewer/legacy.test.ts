import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  assignLegacySequenceIndices,
  buildOptionLabelIndex,
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
