import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  aggregatePulseVotes,
  outcomeAvgConfidence,
  outcomeChooserShare,
} from './pulse-vote-aggregates.ts'
import { canShowFullReveal } from './post-vote-reveal.ts'
import { PARTICIPATION_REVEAL_THRESHOLD } from './display/participation.ts'
import {
  parseSelections,
  primaryFromSelections,
} from './multi-select-pulses.ts'

describe('multi-select aggregation', () => {
  it('counts people once and pickers per option', () => {
    const votes = [
      {
        outcome_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        confidence: 9,
        created_at: '2026-01-01T10:00:00.000Z',
        selections: [
          { outcome_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', confidence: 9 },
          { outcome_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', confidence: 4 },
        ],
      },
      {
        outcome_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        confidence: 8,
        created_at: '2026-01-01T11:00:00.000Z',
        selections: [
          { outcome_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', confidence: 8 },
          { outcome_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', confidence: 0 },
        ],
      },
    ]

    const agg = aggregatePulseVotes(votes)
    assert.equal(agg.totalVotes, 2)
    assert.equal(agg.byOutcome['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']?.count, 1)
    assert.equal(agg.byOutcome['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']?.count, 2)
    assert.equal(agg.byOutcome['cccccccc-cccc-cccc-cccc-cccccccccccc']?.count, 1)

    assert.equal(agg.byOutcome['cccccccc-cccc-cccc-cccc-cccccccccccc']?.confidenceCount, 0)
    assert.equal(
      outcomeAvgConfidence(agg.byOutcome['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']),
      6
    )
    assert.equal(
      outcomeChooserShare(agg.byOutcome['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'], 2),
      1
    )
    assert.equal(
      outcomeChooserShare(agg.byOutcome['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'], 2),
      0.5
    )

    const a = outcomeChooserShare(agg.byOutcome['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'], 2) ?? 0
    const b = outcomeChooserShare(agg.byOutcome['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'], 2) ?? 0
    const c = outcomeChooserShare(agg.byOutcome['cccccccc-cccc-cccc-cccc-cccccccccccc'], 2) ?? 0
    assert.ok(a + b + c > 1)
  })

  it('falls back to primary outcome when selections absent', () => {
    const agg = aggregatePulseVotes([
      {
        outcome_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        confidence: 7,
        created_at: '2026-01-01T10:00:00.000Z',
      },
    ])
    assert.equal(agg.totalVotes, 1)
    assert.equal(agg.byOutcome['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']?.count, 1)
    assert.equal(
      outcomeAvgConfidence(agg.byOutcome['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']),
      7
    )
  })

  it('reveal threshold still counts people not picks', () => {
    assert.equal(PARTICIPATION_REVEAL_THRESHOLD, 25)
    assert.equal(canShowFullReveal(24), false)
    assert.equal(canShowFullReveal(25), true)
  })
})

describe('parseSelections / primaryFromSelections', () => {
  it('parses and picks highest confidence (tie: first)', () => {
    const parsed = parseSelections([
      { outcome_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', confidence: 5 },
      { outcome_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', confidence: 8 },
      { outcome_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', confidence: 8 },
    ])
    assert.equal(parsed.ok, true)
    if (!parsed.ok || !parsed.selections) throw new Error('expected selections')
    const primary = primaryFromSelections(parsed.selections)
    assert.equal(primary.outcome_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  })

  it('rejects duplicates and bad confidence', () => {
    assert.equal(
      parseSelections([
        { outcome_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', confidence: 3 },
        { outcome_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', confidence: 4 },
      ]).ok,
      false
    )
    assert.equal(
      parseSelections([{ outcome_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', confidence: 11 }])
        .ok,
      false
    )
  })
})
