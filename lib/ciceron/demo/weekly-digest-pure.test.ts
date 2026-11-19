import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildWeeklyDigestPreview } from './weekly-digest-pure'

describe('buildWeeklyDigestPreview', () => {
  it('builds a partner-memo digest with Spanish dates', () => {
    const d = buildWeeklyDigestPreview({
      partnerName: 'Socia Valeria Rivera',
      weekStartIso: '2026-11-16',
      weekEndIso: '2026-11-22',
      movements: [
        {
          id: 'm1',
          clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
          acuerdo: 'Se tuvo por presentado el escrito de demanda',
          expedienteNumber: '123/2026',
          courtName: 'Juzgado Primero Civil de Querétaro',
        },
      ],
      deadlines: [
        {
          id: 'dl1',
          clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
          label: 'Contestar demanda',
          dueAt: '2026-11-19T23:59:00-06:00',
        },
      ],
      reviews: [
        {
          id: 'r1',
          title: 'Revisar captura de acuerdo',
          clientName: 'Farma del Centro',
          dueLabel: 'hoy',
        },
      ],
    })
    assert.match(d.subject, /16 al 22 de noviembre de 2026/)
    assert.doesNotMatch(d.subject, /\d{4}-\d{2}-\d{2}/)
    assert.doesNotMatch(d.weekLabel, /\d{4}-\d{2}-\d{2}/)
    assert.match(d.headline, /1 cliente con movimiento/)
    assert.match(d.movements[0]?.text ?? '', /Se tuvo por presentado/)
    assert.match(d.movements[0]?.text ?? '', /123\/2026/)
    assert.match(d.deadlines[0]?.text ?? '', /jueves/)
    assert.equal(d.reviews.length, 1)
    assert.equal(d.simulated, true)
    assert.match(d.closing, /no se envía/i)
  })
})
