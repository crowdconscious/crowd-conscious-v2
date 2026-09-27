import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildReplayPayload,
  computeSimAggregates,
  mapVotesOrdered,
  realAggregatesFromOutcomes,
  type ReplayOutcomeRow,
  type ReplayPersonaRow,
  type ReplayVoteRow,
} from './build-replay.ts'

function persona(over: Partial<ReplayPersonaRow> = {}): ReplayPersonaRow {
  return {
    persona_key: 'mh-fixture-c-001',
    alcaldia: 'Miguel Hidalgo',
    colonia: 'Anáhuac',
    ageb_code: 'FIX-001',
    centroid_lat: 19.4,
    centroid_lng: -99.2,
    nse_band: 'C',
    income_band: 'C',
    age: 34,
    gender: 'femenino',
    education: 'licenciatura',
    occupation: 'FIXTURE',
    household_size: 2,
    persona_narrative: 'FIXTURE persona',
    ...over,
  }
}

function vote(
  sequence_index: number,
  option_id: string,
  over: Partial<ReplayVoteRow> = {},
): ReplayVoteRow {
  return {
    sequence_index,
    option_id,
    confidence: 7,
    reasoning: `reason ${sequence_index}`,
    reasoning_es: null,
    persona: persona({ persona_key: `p-${sequence_index}` }),
    ...over,
  }
}

const outcomes: ReplayOutcomeRow[] = [
  {
    id: 'opt-a',
    label: 'Agua',
    sort_order: 0,
    vote_count: 40,
    total_confidence: 280,
    confident_pick_count: 40,
  },
  {
    id: 'opt-b',
    label: 'Seguridad',
    sort_order: 1,
    vote_count: 60,
    total_confidence: 420,
    confident_pick_count: 60,
  },
]

test('mapVotesOrdered preserves ascending sequenceIndex even if input is shuffled', () => {
  const rows = [
    vote(2, 'opt-a'),
    vote(0, 'opt-b'),
    vote(1, 'opt-a'),
  ]
  const mapped = mapVotesOrdered(rows)
  assert.deepEqual(
    mapped.map((v) => v.sequenceIndex),
    [0, 1, 2],
  )
  // Not grouped by option — order is sequence, not option id
  assert.deepEqual(
    mapped.map((v) => v.optionId),
    ['opt-b', 'opt-a', 'opt-a'],
  )
})

test('buildReplayPayload votes array is strictly ordered by sequenceIndex', () => {
  const shuffled = [
    vote(4, 'opt-b'),
    vote(1, 'opt-a'),
    vote(3, 'opt-b'),
    vote(0, 'opt-a'),
    vote(2, 'opt-a'),
  ]

  const payload = buildReplayPayload({
    run: {
      id: 'run-1',
      market_id: 'pulse-1',
      status: 'complete',
      mode: 'batch',
      model: 'fixture-model',
      n_agents: 5,
      completed_at: '2026-09-01T12:00:00.000Z',
      divergence_index: 12,
      divergence_meta: {
        index: 12,
        shareScore: 10,
        confScore: 15,
        computedAt: '2026-09-01T12:00:00.000Z',
      },
      is_fixture: true,
      revealed_at: null,
    },
    pulse: {
      id: 'pulse-1',
      title: '¿Prioridad?',
      resolution_date: '2026-09-15T00:00:00.000Z',
      status: 'active',
    },
    voteRows: shuffled,
    outcomes,
    totalVotes: 100,
    includeRealAggregates: false,
  })

  assert.equal(payload.isFixture, true)
  assert.equal(payload.run.isFixture, true)
  assert.equal(payload.pulse.status, 'open')
  assert.equal(payload.realAggregates, null)
  assert.equal(payload.votes.length, 5)

  for (let i = 0; i < payload.votes.length; i++) {
    assert.equal(payload.votes[i]!.sequenceIndex, i)
    if (i > 0) {
      assert.ok(
        payload.votes[i]!.sequenceIndex > payload.votes[i - 1]!.sequenceIndex,
        'sequenceIndex must be strictly ascending',
      )
    }
  }
})

test('buildReplayPayload drops rows missing sequence_index or option_id', () => {
  const rows = [
    vote(0, 'opt-a'),
    vote(1, 'opt-b', { sequence_index: null }),
    vote(2, 'opt-a', { option_id: null }),
    vote(3, 'opt-b', { persona: null }),
  ]
  const mapped = mapVotesOrdered(rows)
  assert.equal(mapped.length, 1)
  assert.equal(mapped[0]!.sequenceIndex, 0)
})

test('computeSimAggregates shares sum to ~1', () => {
  const votes = mapVotesOrdered([
    vote(0, 'opt-a'),
    vote(1, 'opt-a'),
    vote(2, 'opt-b'),
    vote(3, 'opt-b'),
  ])
  const options = [
    { id: 'opt-a', label: 'Agua', order: 0 },
    { id: 'opt-b', label: 'Seguridad', order: 1 },
  ]
  const aggs = computeSimAggregates(votes, options)
  const sum = aggs.reduce((s, a) => s + a.share, 0)
  assert.ok(Math.abs(sum - 1) < 1e-9)
  assert.equal(aggs[0]!.count, 2)
  assert.equal(aggs[1]!.count, 2)
})

test('realAggregatesFromOutcomes uses maintained outcome columns (read-only)', () => {
  const aggs = realAggregatesFromOutcomes(outcomes, 100)
  assert.equal(aggs.length, 2)
  assert.equal(aggs[0]!.share, 0.4)
  assert.equal(aggs[1]!.share, 0.6)
  assert.equal(aggs[0]!.meanConfidence, 7)
  assert.equal(aggs[1]!.meanConfidence, 7)
})

test('includeRealAggregates=true populates realAggregates on resolved pulse', () => {
  const payload = buildReplayPayload({
    run: {
      id: 'run-1',
      market_id: 'pulse-1',
      status: 'complete',
      mode: 'batch',
      model: 'm',
      n_agents: 2,
      completed_at: '2026-09-01T12:00:00.000Z',
      divergence_index: null,
      divergence_meta: null,
      is_fixture: false,
      revealed_at: '2026-09-01T12:00:00.000Z',
    },
    pulse: {
      id: 'pulse-1',
      title: 'Q',
      resolution_date: null,
      status: 'resolved',
    },
    voteRows: [vote(0, 'opt-a'), vote(1, 'opt-b')],
    outcomes,
    totalVotes: 100,
    includeRealAggregates: true,
  })
  assert.equal(payload.pulse.status, 'closed')
  assert.ok(payload.realAggregates)
  assert.equal(payload.realAggregates!.length, 2)
  assert.equal(payload.isFixture, false)
})
