import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  boardStatusToLegend,
  buildMapProgress,
  formatMapProgressLabel,
  mapStatusForState,
} from './map-progress-pure'

describe('boardStatusToLegend', () => {
  it('maps board statuses to legend keys', () => {
    assert.equal(boardStatusToLegend('revisado'), 'revisado')
    assert.equal(boardStatusToLegend('fallo'), 'fallo')
    assert.equal(boardStatusToLegend('manual'), 'revision_pendiente')
    assert.equal(boardStatusToLegend('parcial'), 'revision_pendiente')
    assert.equal(boardStatusToLegend('sin_publicacion'), 'sin_publicacion')
  })
})

describe('buildMapProgress', () => {
  it('counts reviewed vs remaining and keeps respaldo time', () => {
    const progress = buildMapProgress({
      board: [
        { status: 'revisado' },
        { status: 'revisado' },
        { status: 'manual' },
        { status: 'fallo' },
      ],
      respaldoHm: '10:00',
    })
    assert.deepEqual(progress, {
      total: 4,
      reviewed: 2,
      remaining: 2,
      respaldoHm: '10:00',
    })
  })
})

describe('mapStatusForState', () => {
  it('defaults to sin_publicacion when the state is absent', () => {
    assert.equal(mapStatusForState(new Map(), 'SON'), 'sin_publicacion')
    assert.equal(
      mapStatusForState(new Map([['GTO', 'manual']]), 'GTO'),
      'revision_pendiente'
    )
  })
})

describe('formatMapProgressLabel', () => {
  it('builds the firm progress sentence', () => {
    const label = formatMapProgressLabel(
      { total: 24, reviewed: 21, remaining: 3, respaldoHm: '10:00' },
      {
        of: 'de',
        reviewed: 'entidades revisadas',
        missing: 'faltan',
        respaldo: 'respaldo',
      }
    )
    assert.equal(
      label,
      '21 de 24 entidades revisadas · faltan 3 · respaldo 10:00'
    )
  })
})
