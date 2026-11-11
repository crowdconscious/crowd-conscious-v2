import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractCitedChunkIds } from './evidence-sources'
import { buildCitationIndex } from './format-answer'

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

describe('ciceron evidence-sources', () => {
  it('extractCitedChunkIds returns unique ids in first-appearance order', () => {
    const body = `Uno [chunk:${A}] dos [chunk:${B}] otra vez [chunk:${A}] y (${B}).`
    assert.deepEqual(extractCitedChunkIds(body), [A, B])
  })

  it('chip numbers are per unique chunk — repeated cites share one number', () => {
    // Three different licitaciones mentioned, but the model cites the same chunk thrice.
    const body = [
      `Licitación IMSS-1 publicada. [chunk:${A}]`,
      `Licitación IMSS-2 en la misma nota. [chunk:${A}]`,
      `Licitación FGR referida en el mismo pasaje. [chunk:${A}]`,
      `Otra nota distinta. [chunk:${B}]`,
    ].join(' ')
    const index = buildCitationIndex(body)
    assert.equal(index.numberById.get(A), 1)
    assert.equal(index.numberById.get(B), 2)
    assert.equal(index.orderedIds.length, 2)
    // Not a mapping bug: three licitaciones → one chip number when one chunk.
    const occurrencesOfOne = (body.match(new RegExp(`\\[chunk:${A}\\]`, 'g')) || []).length
    assert.equal(occurrencesOfOne, 3)
  })
})
