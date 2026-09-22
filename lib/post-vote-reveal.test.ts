import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildRevealHeadline,
  canShowFullReveal,
  CONFIDENCE_UNKNOWN,
  isStatedConfidence,
  type RevealOutcome,
} from './post-vote-reveal.ts'
import { PARTICIPATION_REVEAL_THRESHOLD } from './display/participation.ts'

describe('post-vote-reveal', () => {
  it('uses PARTICIPATION_REVEAL_THRESHOLD = 25', () => {
    assert.equal(PARTICIPATION_REVEAL_THRESHOLD, 25)
    assert.equal(canShowFullReveal(24), false)
    assert.equal(canShowFullReveal(25), true)
  })

  it('treats confidence 0 as unknown, not stated', () => {
    assert.equal(CONFIDENCE_UNKNOWN, 0)
    assert.equal(isStatedConfidence(0), false)
    assert.equal(isStatedConfidence(5), true)
  })

  it('picks leader_lower_confidence when trailer is surer', () => {
    const outcomes: RevealOutcome[] = [
      { id: 'a', label: 'Opción A', probability: 0.6, avgConfidence: 5 },
      { id: 'b', label: 'Opción B', probability: 0.4, avgConfidence: 9 },
    ]
    const h = buildRevealHeadline(outcomes, 'a', 'es')
    assert.equal(h.case, 'leader_lower_confidence')
    assert.match(h.text, /Opción A gana/)
  })

  it('picks majority_high_confidence when user is with sure majority', () => {
    const outcomes: RevealOutcome[] = [
      { id: 'a', label: 'Opción A', probability: 0.7, avgConfidence: 8 },
      { id: 'b', label: 'Opción B', probability: 0.3, avgConfidence: 4 },
    ]
    const h = buildRevealHeadline(outcomes, 'a', 'es')
    assert.equal(h.case, 'majority_high_confidence')
  })

  it('picks minority_highest_confidence when user holds top certainty', () => {
    const outcomes: RevealOutcome[] = [
      { id: 'a', label: 'Opción A', probability: 0.65, avgConfidence: 6 },
      { id: 'b', label: 'Opción B', probability: 0.35, avgConfidence: 9 },
    ]
    const h = buildRevealHeadline(outcomes, 'b', 'es')
    assert.equal(h.case, 'minority_highest_confidence')
  })
})
