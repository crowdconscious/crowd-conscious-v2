import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decideCardPrimaryAction } from './card-action-pure'

describe('decideCardPrimaryAction', () => {
  it('socio exact match → notify client', () => {
    const d = decideCardPrimaryAction({
      role: 'socio',
      caseFileId: 'case-1',
      sourceUrl: 'https://example.com',
      matchKind: 'exact',
      needsManual: false,
    })
    assert.equal(d.id, 'notify-client')
    assert.equal(d.denied, false)
  })

  it('coordinador with manual → assign pasante', () => {
    const d = decideCardPrimaryAction({
      role: 'coordinador',
      caseFileId: null,
      sourceUrl: null,
      matchKind: 'possible',
      needsManual: true,
    })
    assert.equal(d.id, 'assign-pasante')
  })

  it('pasante without manual is denied mark-reviewed to client', () => {
    const d = decideCardPrimaryAction({
      role: 'pasante',
      caseFileId: 'case-1',
      sourceUrl: null,
      matchKind: 'exact',
      needsManual: false,
    })
    assert.equal(d.id, 'mark-reviewed')
    assert.equal(d.denied, true)
    assert.ok(d.denyReason)
  })
})
