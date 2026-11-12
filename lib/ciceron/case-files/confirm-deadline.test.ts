import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertCanConfirmDeadline,
  canConfirmDeadline,
} from '@/lib/ciceron/case-files/confirm-deadline'

describe('deadline confirmation authority (tier 2)', () => {
  it('allows socio and asociado to confirm', () => {
    assert.equal(canConfirmDeadline('socio'), true)
    assert.equal(canConfirmDeadline('asociado'), true)
    assert.equal(canConfirmDeadline('admin'), true)
  })

  it('rejects pasante confirmation', () => {
    assert.equal(canConfirmDeadline('pasante'), false)
    const r = assertCanConfirmDeadline({
      role: 'pasante',
      nextStatus: 'confirmado',
      confirmedBy: 'b1000000-0000-4000-8000-000000000003',
    })
    assert.equal(r.ok, false)
    if (!r.ok) {
      assert.equal(r.code, 'forbidden')
      assert.match(r.message, /socio|asociado/i)
    }
  })

  it('requires confirmedBy when confirming', () => {
    const r = assertCanConfirmDeadline({
      role: 'socio',
      nextStatus: 'confirmado',
      confirmedBy: null,
    })
    assert.equal(r.ok, false)
  })
})
