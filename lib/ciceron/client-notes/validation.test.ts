import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseSubmitClientNeedNoteInput } from '@/lib/ciceron/client-notes/validation'

describe('parseSubmitClientNeedNoteInput', () => {
  it('accepts a valid note', () => {
    const r = parseSubmitClientNeedNoteInput({
      context: 'hoy',
      body: 'Quisiéramos automatizar Guanajuato.',
    })
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.data.context, 'hoy')
      assert.match(r.data.body, /Guanajuato/)
    }
  })

  it('rejects empty body', () => {
    const r = parseSubmitClientNeedNoteInput({ context: 'boletines', body: '   ' })
    assert.equal(r.ok, false)
  })

  it('rejects invalid context', () => {
    const r = parseSubmitClientNeedNoteInput({
      context: 'ventas',
      body: 'Texto válido de prueba.',
    })
    assert.equal(r.ok, false)
  })

  it('rejects oversized body', () => {
    const r = parseSubmitClientNeedNoteInput({
      context: 'general',
      body: 'x'.repeat(2001),
    })
    assert.equal(r.ok, false)
  })

  it('defaults context to general', () => {
    const r = parseSubmitClientNeedNoteInput({ body: 'Una sugerencia útil.' })
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.data.context, 'general')
  })
})
