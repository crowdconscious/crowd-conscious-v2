import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatParticipationCount,
  PARTICIPATION_REVEAL_THRESHOLD,
  shouldRevealCount,
} from './participation.ts'

describe('shouldRevealCount', () => {
  it('hides thin open-vote counts', () => {
    assert.equal(shouldRevealCount(0), false)
    assert.equal(shouldRevealCount(PARTICIPATION_REVEAL_THRESHOLD - 1), false)
    assert.equal(shouldRevealCount(PARTICIPATION_REVEAL_THRESHOLD), true)
  })
})

describe('formatParticipationCount', () => {
  it('returns Votación abierta below threshold while voting is open', () => {
    assert.equal(formatParticipationCount(3, 'es'), 'Votación abierta')
    assert.equal(formatParticipationCount(3, 'en'), 'Voting open')
  })

  it('shows the real tally when votingClosed even below threshold', () => {
    assert.equal(
      formatParticipationCount(3, 'es', { votingClosed: true }),
      '3 votos',
    )
    assert.equal(
      formatParticipationCount(1, 'en', { votingClosed: true }),
      '1 vote',
    )
  })

  it('still formats large counts with units', () => {
    assert.equal(formatParticipationCount(128, 'es'), '128 votos')
    assert.equal(
      formatParticipationCount(128, 'es', { withUnit: false }),
      '128',
    )
  })
})
