import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findStatePanelDetail, formatConsultHm } from './map-state-panel-pure'

describe('formatConsultHm', () => {
  it('returns HH:MM for a CDMX instant', () => {
    const hm = formatConsultHm('2026-11-18T15:30:00-06:00')
    assert.equal(hm, '15:30')
  })

  it('returns null for empty', () => {
    assert.equal(formatConsultHm(null), null)
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
