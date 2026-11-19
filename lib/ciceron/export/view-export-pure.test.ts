import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildCsv,
  buildMatrix,
  csvEscape,
  suggestFilename,
} from './view-export-pure'

describe('view-export-pure', () => {
  it('escapes quotes and commas', () => {
    assert.equal(csvEscape('a,b'), '"a,b"')
    assert.equal(csvEscape('dice "hola"'), '"dice ""hola"""')
    assert.equal(csvEscape(null), '')
  })

  it('builds csv and matrix', () => {
    const cols = [
      { key: 'a', header: 'Entidad' },
      { key: 'b', header: 'Notas' },
    ]
    const rows = [{ a: 'CDMX', b: 'uno, dos' }]
    assert.equal(buildCsv(cols, rows), 'Entidad,Notas\nCDMX,"uno, dos"')
    assert.deepEqual(buildMatrix(cols, rows), {
      headers: ['Entidad', 'Notas'],
      body: [['CDMX', 'uno, dos']],
    })
  })

  it('suggests safe filenames', () => {
    assert.equal(suggestFilename('Coincidencias Hoy', 'csv'), 'coincidencias-hoy.csv')
  })
})
