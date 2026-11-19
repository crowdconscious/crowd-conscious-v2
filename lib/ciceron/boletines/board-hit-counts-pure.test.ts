import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyHitCountsToBoard, hitCountsByState } from './board-hit-counts-pure'

describe('board-hit-counts-pure', () => {
  it('counts exact and possible hits per state', () => {
    const map = hitCountsByState([
      { stateCode: 'CDMX', matchKind: 'exact' },
      { stateCode: 'cdmx', matchKind: 'exact' },
      { stateCode: 'JAL', matchKind: 'possible' },
      { stateCode: 'QRO', matchKind: 'exact' },
    ])
    assert.deepEqual(map.get('CDMX'), { hitsExact: 2, hitsPossible: 0 })
    assert.deepEqual(map.get('JAL'), { hitsExact: 0, hitsPossible: 1 })
    assert.deepEqual(map.get('QRO'), { hitsExact: 1, hitsPossible: 0 })
  })

  it('overlays list counts onto board rows without inventing states', () => {
    const board = applyHitCountsToBoard(
      [
        { stateCode: 'CDMX', hitsExact: 0, hitsPossible: 0, status: 'fallo' },
        { stateCode: 'GTO', hitsExact: 0, hitsPossible: 0, status: 'manual' },
      ],
      [
        { stateCode: 'CDMX', matchKind: 'exact' },
        { stateCode: 'JAL', matchKind: 'exact' },
      ]
    )
    assert.equal(board[0]?.hitsExact, 1)
    assert.equal(board[1]?.hitsExact, 0)
    assert.equal(board.length, 2)
  })
})
