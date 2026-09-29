/**
 * Pure helpers for durable divergence track record (no DB).
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

type TrackOutcome = 'scored' | 'no_real_data'

function storeScore(outcome: TrackOutcome, score: number | null): number | null {
  return outcome === 'scored' && score != null ? score : null
}

describe('divergence track conventions', () => {
  it('no_real_data never invents a score of 0', () => {
    assert.equal(storeScore('no_real_data', 0), null)
    assert.equal(storeScore('no_real_data', null), null)
  })

  it('scored may legitimately be 0 (identical distributions)', () => {
    assert.equal(storeScore('scored', 0), 0)
  })
})
