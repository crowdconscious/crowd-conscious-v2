import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildUploadStoragePath,
  isTextProcessable,
  parseManualUploadInput,
} from '@/lib/ciceron/boletines/manual-upload-validation'

describe('parseManualUploadInput', () => {
  it('accepts pasted text for CDMX', () => {
    const r = parseManualUploadInput({
      stateCode: 'cdmx',
      publicationDate: '2026-11-25',
      pastedText: 'Juzgado Primero\nExp. 1/2020',
    })
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.data.stateCode, 'CDMX')
  })

  it('requires file or text', () => {
    const r = parseManualUploadInput({
      stateCode: 'GTO',
      publicationDate: '2026-11-25',
    })
    assert.equal(r.ok, false)
  })

  it('rejects unknown state', () => {
    const r = parseManualUploadInput({
      stateCode: 'XX',
      publicationDate: '2026-11-25',
      pastedText: 'hola',
    })
    assert.equal(r.ok, false)
  })

  it('rejects pasted text over 500000 characters', () => {
    const r = parseManualUploadInput({
      stateCode: 'CDMX',
      publicationDate: '2026-11-25',
      pastedText: 'x'.repeat(500_001),
    })
    assert.equal(r.ok, false)
    if (!r.ok) assert.match(r.message, /500/)
  })
})

describe('isTextProcessable / storage path', () => {
  it('treats pasted text and txt as processable', () => {
    assert.equal(isTextProcessable(null, 'abc'), true)
    assert.equal(isTextProcessable('text/plain'), true)
    assert.equal(isTextProcessable('application/pdf'), false)
  })

  it('builds firm-prefixed storage path', () => {
    const path = buildUploadStoragePath({
      firmId: 'a1000000-0000-4000-8000-000000000001',
      publicationDate: '2026-11-25',
      uploadId: 'u1',
      mime: 'application/pdf',
    })
    assert.equal(
      path,
      'a1000000-0000-4000-8000-000000000001/boletines/uploads/2026-11-25/u1.pdf'
    )
  })
})
