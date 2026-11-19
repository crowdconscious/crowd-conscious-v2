import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sortBoardRows } from '@/lib/ciceron/boletines/board-sort'
import { bulletinNumberDisplay } from '@/lib/ciceron/boletines/bulletin-number-display'

describe('bulletinNumberDisplay', () => {
  it('maps internal -DEMO tokens to Boletín N', () => {
    assert.equal(bulletinNumberDisplay('QRO-DEMO'), 'Boletín 214')
    assert.equal(bulletinNumberDisplay('JAL-DEMO'), 'Boletín 187')
    assert.equal(bulletinNumberDisplay('CDMX-DEMO-512'), 'Boletín 512')
    assert.equal(bulletinNumberDisplay('MEX-LISTA-DEMO'), 'Boletín 901')
    assert.equal(bulletinNumberDisplay('GRO-DEMO'), 'Boletín 118')
  })

  it('never returns a string containing DEMO', () => {
    for (const raw of [
      'QRO-DEMO',
      'CDMX-DEMO-512',
      'MEX-LISTA-DEMO',
      'GRO-DEMO',
      '512',
    ]) {
      const out = bulletinNumberDisplay(raw)
      assert.ok(out)
      assert.doesNotMatch(out, /DEMO/i)
    }
  })
})

describe('sortBoardRows', () => {
  it('orders failed/pending first, then CDMX and Estado de México', () => {
    const sorted = sortBoardRows([
      { stateCode: 'QRO', stateName: 'Querétaro', status: 'revisado' as const },
      { stateCode: 'JAL', stateName: 'Jalisco', status: 'revisado' as const },
      { stateCode: 'MEX', stateName: 'Estado de México', status: 'revisado' as const },
      { stateCode: 'CDMX', stateName: 'Ciudad de México', status: 'revisado' as const },
      { stateCode: 'GTO', stateName: 'Guanajuato', status: 'manual' as const },
      { stateCode: 'NL', stateName: 'Nuevo León', status: 'fallo' as const },
    ])
    assert.deepEqual(
      sorted.map((r) => r.stateCode),
      ['NL', 'GTO', 'CDMX', 'MEX', 'JAL', 'QRO']
    )
  })
})
