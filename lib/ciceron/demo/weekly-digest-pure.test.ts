import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildWeeklyDigestPreview } from './weekly-digest-pure'

describe('buildWeeklyDigestPreview', () => {
  it('builds a Monday-style partner digest', () => {
    const d = buildWeeklyDigestPreview({
      partnerName: 'Socia Valeria Rivera',
      weekStartIso: '2026-11-16',
      weekEndIso: '2026-11-22',
      movedClients: ['Nexora Pagos, S.A.P.I. de C.V.'],
      plazosCount: 1,
      reviewsPending: 2,
    })
    assert.match(d.subject, /Resumen semanal/)
    assert.equal(d.simulated, true)
    assert.ok(d.bullets.length >= 2)
    assert.match(d.closing, /no se envía/i)
  })
})
