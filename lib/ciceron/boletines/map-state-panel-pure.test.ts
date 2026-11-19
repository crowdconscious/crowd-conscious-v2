import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  findStatePanelDetail,
  formatConsultHm,
  pickDefaultStateCode,
} from './map-state-panel-pure'

describe('formatConsultHm', () => {
  it('returns HH:MM for a CDMX instant', () => {
    assert.equal(formatConsultHm('2026-11-18T15:30:00-06:00'), '15:30')
  })
})

describe('pickDefaultStateCode', () => {
  it('prefers failed over pending over reviewed-with-hits', () => {
    const code = pickDefaultStateCode([
      { stateCode: 'QRO', status: 'revisado', hitsExact: 2 },
      { stateCode: 'CDMX', status: 'fallo', hitsExact: 0 },
      { stateCode: 'NL', status: 'manual', hitsExact: 0 },
    ])
    assert.equal(code, 'CDMX')
  })
})

describe('findStatePanelDetail', () => {
  it('finds by stateCode', () => {
    const row = findStatePanelDetail(
      [
        {
          stateCode: 'CDMX',
          stateName: 'Ciudad de México',
          statusLabel: 'Falló',
          status: 'fallo',
          sourceName: 'Fuente',
          lastConsultHm: '09:12',
          reviewerName: null,
          matters: [],
          hitsExact: 0,
          hitsPossible: 0,
        },
      ],
      'CDMX'
    )
    assert.equal(row?.stateName, 'Ciudad de México')
  })
})
