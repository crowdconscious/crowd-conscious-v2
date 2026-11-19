import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  minutesFromMidnight,
  remainingToMilestone,
  uncoveredEntityCount,
} from '@/lib/ciceron/boletines/clock'

describe('bulletin clock', () => {
  it('computes remaining time before objetivo', () => {
    const r = remainingToMilestone('09:30', '08:00')
    assert.equal(r.passed, false)
    assert.equal(r.label, '1 h 30 min')
  })

  it('marks passed milestones', () => {
    assert.equal(remainingToMilestone('09:30', '10:00').passed, true)
  })

  it('counts uncovered entities', () => {
    assert.equal(
      uncoveredEntityCount([
        { status: 'revisado' },
        { status: 'fallo' },
        { status: 'manual' },
      ]),
      2
    )
  })

  it('parses HH:MM to minutes', () => {
    assert.equal(minutesFromMidnight('12:00'), 720)
  })
})
