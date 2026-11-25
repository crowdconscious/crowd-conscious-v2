import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FEDERAL_DIRECTORY,
  STATE_DIRECTORY,
  findStateDirectoryEntry,
  stateDirectorySorted,
} from '@/lib/ciceron/boletines/state-directory'

describe('state directory', () => {
  it('covers all 32 entities with accents', () => {
    assert.equal(STATE_DIRECTORY.length, 32)
    const names = new Set(STATE_DIRECTORY.map((s) => s.stateName))
    assert.ok(names.has('Ciudad de México'))
    assert.ok(names.has('Estado de México'))
    assert.ok(names.has('Michoacán'))
    assert.ok(names.has('Yucatán'))
    assert.ok(names.has('Querétaro'))
    assert.ok(names.has('Nuevo León'))
  })

  it('marks Edomex as firm login', () => {
    assert.equal(findStateDirectoryEntry('MEX')?.accessType, 'requiere_usuario')
  })

  it('sorts by Spanish name', () => {
    const sorted = stateDirectorySorted()
    assert.equal(sorted[0].stateName, 'Aguascalientes')
    assert.equal(sorted[sorted.length - 1].stateName, 'Zacatecas')
  })

  it('uses entry pages only (no date deep links)', () => {
    for (const e of [...STATE_DIRECTORY, ...FEDERAL_DIRECTORY]) {
      assert.ok(/^https?:\/\//i.test(e.landingUrl))
      assert.equal(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(e.landingUrl), false)
    }
  })

  it('includes federal DOF and SCJN landings', () => {
    assert.ok(FEDERAL_DIRECTORY.some((f) => f.sourceKey === 'fed_dof'))
    assert.ok(FEDERAL_DIRECTORY.some((f) => f.sourceKey === 'fed_scjn'))
    assert.ok(
      FEDERAL_DIRECTORY.some((f) => f.landingUrl.includes('scjn.gob.mx'))
    )
  })
})
