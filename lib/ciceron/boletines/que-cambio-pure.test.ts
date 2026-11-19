import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildQueCambio } from './que-cambio-pure'

describe('buildQueCambio', () => {
  it('builds before/after in plain Spanish', () => {
    const parts = buildQueCambio({
      clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
      summary: 'Se tiene por presentado el escrito de demanda.',
      matchKind: 'exact',
      courtName: 'Juzgado Primero Civil de Querétaro',
      expedienteNumber: '123/2026',
    })
    assert.match(parts.before, /^Antes:/)
    assert.match(parts.after, /^Ahora:/)
    assert.match(parts.after, /123\/2026/)
    assert.match(parts.legalDetail, /no constituye notificación judicial/)
  })
})
