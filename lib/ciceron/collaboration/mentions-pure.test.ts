import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  extractMentionIds,
  filterMentionCandidates,
} from './mentions-pure'

const members = [
  { id: '1', displayName: 'Ana Socio' },
  { id: '2', displayName: 'Bruno Asociado' },
  { id: '3', displayName: 'Ana' },
]

describe('extractMentionIds', () => {
  it('extracts firm member mentions', () => {
    const ids = extractMentionIds('Hola @Ana Socio y @Bruno Asociado', members)
    assert.deepEqual(ids.sort(), ['1', '2'])
  })

  it('prefers longer display names', () => {
    const ids = extractMentionIds('Ping @Ana Socio', members)
    assert.deepEqual(ids, ['1'])
  })

  it('ignores unknown mentions', () => {
    assert.deepEqual(extractMentionIds('Hola @Desconocido', members), [])
  })
})

describe('filterMentionCandidates', () => {
  it('filters by query', () => {
    const r = filterMentionCandidates('bru', members)
    assert.equal(r.length, 1)
    assert.equal(r[0]?.id, '2')
  })
})
