import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  partnerCoverageByState,
  partnerCoverageStatus,
  partnerStateMatchesHref,
} from './partner-coverage-status-pure'

describe('partner-coverage-status-pure', () => {
  it('marks reviewed with no hits as al día', () => {
    assert.equal(
      partnerCoverageStatus({ stateCode: 'CDMX', status: 'revisado', hitsExact: 0 }),
      'al_dia'
    )
  })

  it('marks reviewed with hits as con novedades', () => {
    assert.equal(
      partnerCoverageStatus({
        stateCode: 'JAL',
        status: 'revisado',
        hitsExact: 1,
        hitsPossible: 0,
      }),
      'con_novedades'
    )
  })

  it('marks fallo / manual / parcial / sin publicación as por verificar', () => {
    for (const status of ['fallo', 'manual', 'parcial', 'sin_publicacion'] as const) {
      assert.equal(
        partnerCoverageStatus({ stateCode: 'GTO', status, hitsExact: 2 }),
        'por_verificar'
      )
    }
  })

  it('builds a state map and matches href', () => {
    const by = partnerCoverageByState([
      { stateCode: 'CDMX', status: 'revisado', hitsExact: 0 },
      { stateCode: 'MEX', status: 'revisado', hitsExact: 2 },
    ])
    assert.equal(by.get('CDMX'), 'al_dia')
    assert.equal(by.get('MEX'), 'con_novedades')
    assert.equal(partnerStateMatchesHref('cdmx'), '/ciceron/boletines?estado=CDMX')
  })
})
