import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CICERON_DOCUMENT_TYPES,
  CICERON_SUBJECT_AREAS,
  inferDocumentTypeFromTitle,
  isProcurementDocumentType,
} from './taxonomy'

describe('ciceron taxonomy', () => {
  it('has the fixed subject catalogue', () => {
    assert.ok(CICERON_SUBJECT_AREAS.includes('financiero y fintech'))
    assert.ok(CICERON_SUBJECT_AREAS.includes('otros'))
    assert.equal(CICERON_SUBJECT_AREAS.length, 16)
  })

  it('includes procurement document types', () => {
    assert.ok(CICERON_DOCUMENT_TYPES.includes('licitacion'))
    assert.ok(CICERON_DOCUMENT_TYPES.includes('fallo'))
    assert.ok(CICERON_DOCUMENT_TYPES.includes('contratacion_publica'))
    assert.ok(CICERON_DOCUMENT_TYPES.includes('convocatoria'))
  })

  it('infers document types from titles', () => {
    assert.equal(inferDocumentTypeFromTitle('Decreto por el que…'), 'decreto')
    assert.equal(inferDocumentTypeFromTitle('Aviso REF:123'), 'aviso')
    assert.equal(inferDocumentTypeFromTitle('Acuerdo por el que…'), 'acuerdo')
    assert.equal(
      inferDocumentTypeFromTitle('Licitación pública nacional para…'),
      'licitacion'
    )
    assert.equal(
      inferDocumentTypeFromTitle('Fallo de la licitación pública…'),
      'fallo'
    )
    assert.equal(inferDocumentTypeFromTitle('Convocatoria…'), 'convocatoria')
  })

  it('flags procurement types for the separate monitor lane', () => {
    assert.equal(isProcurementDocumentType('licitacion'), true)
    assert.equal(isProcurementDocumentType('fallo'), true)
    assert.equal(isProcurementDocumentType('contratacion_publica'), true)
    assert.equal(isProcurementDocumentType('convocatoria'), true)
    assert.equal(isProcurementDocumentType('decreto'), false)
    assert.equal(isProcurementDocumentType('acuerdo'), false)
    assert.equal(isProcurementDocumentType(null), false)
  })
})
