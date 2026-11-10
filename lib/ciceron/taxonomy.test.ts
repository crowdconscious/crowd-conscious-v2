import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CICERON_SUBJECT_AREAS, inferDocumentTypeFromTitle } from './taxonomy'

describe('ciceron taxonomy', () => {
  it('has the fixed subject catalogue', () => {
    assert.ok(CICERON_SUBJECT_AREAS.includes('financiero y fintech'))
    assert.ok(CICERON_SUBJECT_AREAS.includes('otros'))
    assert.equal(CICERON_SUBJECT_AREAS.length, 16)
  })

  it('infers document types from titles', () => {
    assert.equal(inferDocumentTypeFromTitle('Decreto por el que…'), 'decreto')
    assert.equal(inferDocumentTypeFromTitle('Aviso REF:123'), 'aviso')
    assert.equal(inferDocumentTypeFromTitle('Acuerdo por el que…'), 'acuerdo')
  })
})
