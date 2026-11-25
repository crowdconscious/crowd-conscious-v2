import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FEDERAL_DIRECTORY,
  STATE_DIRECTORY,
  findStateDirectoryEntry,
  stateDirectorySorted,
  uploadPrefillHref,
} from '@/lib/ciceron/boletines/state-directory'

describe('state directory', () => {
  it('covers all 32 entidades with accents', () => {
    assert.equal(STATE_DIRECTORY.length, 32)
    const names = new Set(STATE_DIRECTORY.map((s) => s.stateName))
    assert.ok(names.has('Ciudad de México'))
    assert.ok(names.has('Estado de México'))
    assert.ok(names.has('Michoacán'))
    assert.ok(names.has('Yucatán'))
    assert.ok(names.has('Querétaro'))
  })

  it('marks Querétaro and Jalisco as automatico', () => {
    assert.equal(findStateDirectoryEntry('QRO')?.automation, 'automatico')
    assert.equal(findStateDirectoryEntry('JAL')?.automation, 'automatico')
  })

  it('marks Edomex as firm login', () => {
    assert.equal(findStateDirectoryEntry('MEX')?.accessType, 'requiere_usuario')
  })

  it('sorts by Spanish name', () => {
    const sorted = stateDirectorySorted()
    assert.equal(sorted[0].stateName, 'Aguascalientes')
    assert.equal(sorted[sorted.length - 1].stateName, 'Zacatecas')
  })

  it('builds upload prefill href', () => {
    assert.equal(uploadPrefillHref('gto'), '/ciceron/boletines?subir=1&estado=GTO')
  })

  it('includes federal DOF and SCJN landings', () => {
    assert.ok(FEDERAL_DIRECTORY.some((f) => f.sourceKey === 'fed_dof'))
    assert.ok(FEDERAL_DIRECTORY.some((f) => f.sourceKey === 'fed_scjn'))
  })
})
