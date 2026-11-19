import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildEmptyHitsMessage, buildEmptyHoyMessage } from './empty-state-pure'

describe('empty-state-pure', () => {
  it('builds the partner-facing Hoy empty line', () => {
    const msg = buildEmptyHoyMessage({
      matterCount: 38,
      bulletinsReviewed: 6,
      consultedAtHm: '09:30',
    })
    assert.equal(
      msg,
      'Hoy no hubo movimientos en sus 38 asuntos. Revisamos 6 boletines a las 09:30.'
    )
  })

  it('builds empty hits with state count', () => {
    const msg = buildEmptyHitsMessage({ statesChecked: 4, consultedAtHm: '09:30' })
    assert.match(msg, /4 entidades/)
    assert.match(msg, /09:30/)
  })
})
