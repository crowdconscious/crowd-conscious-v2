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
import {
  assignLegacySequenceIndices,
  householdSizeFromText,
  normalizeLabelKey,
  normalizeNseBand,
  parseDivergenceMeta,
  resolveOptionId,
  buildOptionLabelIndex,
} from './legacy.ts'

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
  sequence_index: number | null,
  option_id: string | null,
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

const mapOpts = { outcomes, runId: 'run-legacy-1' }

test('mapVotesOrdered preserves ascending sequenceIndex even if input is shuffled', () => {
  const rows = [
    vote(2, 'opt-a'),
    vote(0, 'opt-b'),
    vote(1, 'opt-a'),
  ]
  const mapped = mapVotesOrdered(rows, mapOpts)
  assert.deepEqual(
    mapped.votes.map((v) => v.sequenceIndex),
    [0, 1, 2],
  )
  assert.deepEqual(
    mapped.votes.map((v) => v.optionId),
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
  assert.equal(payload.meta?.votesResolved, 5)
  assert.equal(payload.meta?.votesUnmatched, 0)

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

test('mapVotesOrdered drops unmatched labels and missing personas; counts them', () => {
  const rows = [
    vote(0, 'opt-a'),
    vote(null, null, { option_chosen: 'No Existe' }),
    vote(2, 'opt-a', { persona: null }),
    vote(null, null, { option_chosen: 'agua' }), // accent/case match → opt-a
  ]
  const mapped = mapVotesOrdered(rows, mapOpts)
  assert.equal(mapped.votes.length, 2)
  assert.equal(mapped.unmatchedCount, 1)
  assert.equal(mapped.missingPersonaCount, 1)
  assert.equal(mapped.totalCount, 4)
  assert.ok(mapped.votes.every((v) => v.optionId === 'opt-a' || v.optionId === 'opt-b'))
})

test('computeSimAggregates shares sum to ~1', () => {
  const votes = mapVotesOrdered(
    [vote(0, 'opt-a'), vote(1, 'opt-a'), vote(2, 'opt-b'), vote(3, 'opt-b')],
    mapOpts,
  ).votes
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

test('persona grounding passes through unchanged when present', () => {
  const grounding = {
    sources: [
      {
        name: 'INEGI Censo (FIXTURE)',
        year: 2020,
        url: 'https://www.inegi.org.mx/',
        table: 'FIXTURE',
      },
    ],
    ageb: {
      code: 'FIX-001',
      population: 1200,
      marginals: [{ label: 'FIXTURE NSE', value: 'C', share: 0.2 }],
    },
    method: 'FIXTURE sampling',
    isExample: true as const,
  }

  const mapped = mapVotesOrdered(
    [
      vote(0, 'opt-a', {
        persona: persona({ persona_key: 'p-0', grounding }),
      }),
    ],
    mapOpts,
  )

  assert.equal(mapped.votes.length, 1)
  assert.deepEqual(mapped.votes[0]!.persona.grounding, grounding)
  assert.equal(mapped.votes[0]!.persona.grounding?.isExample, true)
  assert.equal(mapped.votes[0]!.persona.grounding?.ageb.code, 'FIX-001')
})

test('persona grounding omitted when null or absent', () => {
  const withNull = mapVotesOrdered(
    [
      vote(0, 'opt-a', {
        persona: persona({ persona_key: 'p-null', grounding: null }),
      }),
    ],
    mapOpts,
  )
  assert.equal(withNull.votes[0]!.persona.grounding, undefined)
  assert.equal('grounding' in withNull.votes[0]!.persona, false)

  const absent = mapVotesOrdered(
    [
      vote(1, 'opt-b', {
        persona: persona({ persona_key: 'p-absent' }),
      }),
    ],
    mapOpts,
  )
  assert.equal(absent.votes[0]!.persona.grounding, undefined)
  assert.equal('grounding' in absent.votes[0]!.persona, false)
})

// ---------------------------------------------------------------------------
// Legacy read-time support
// ---------------------------------------------------------------------------

test('normalizeLabelKey is trim + case + accent insensitive', () => {
  assert.equal(normalizeLabelKey('  Água  '), normalizeLabelKey('agua'))
  assert.equal(normalizeLabelKey('Seguridad'), normalizeLabelKey('seguridad'))
  assert.equal(normalizeLabelKey('Niños'), normalizeLabelKey('ninos'))
  assert.equal(normalizeLabelKey('Educación'), normalizeLabelKey('EDUCACION'))
})

test('resolveOptionId matches option_chosen to labels accent/case-insensitively', () => {
  const index = buildOptionLabelIndex([
    { id: 'opt-a', label: 'Agua limpia' },
    { id: 'opt-b', label: 'Educación' },
  ])
  assert.equal(
    resolveOptionId({ option_id: null, option_chosen: 'agua limpia' }, index),
    'opt-a',
  )
  assert.equal(
    resolveOptionId({ option_id: null, option_chosen: '  EDUCACION ' }, index),
    'opt-b',
  )
  assert.equal(
    resolveOptionId({ option_id: 'opt-a', option_chosen: 'nope' }, index),
    'opt-a',
  )
  assert.equal(
    resolveOptionId({ option_id: null, option_chosen: 'desconocido' }, index),
    null,
  )
})

test('assignLegacySequenceIndices is deterministic for the same run id', () => {
  const nulls = [null, null, null, null, null]
  const a = assignLegacySequenceIndices(nulls, 'run-abc')
  const b = assignLegacySequenceIndices(nulls, 'run-abc')
  assert.deepEqual(a, b)
  assert.deepEqual([...a].sort((x, y) => x - y), [0, 1, 2, 3, 4])
  const c = assignLegacySequenceIndices(nulls, 'run-other')
  // Different seed → almost certainly different order (not required equal).
  assert.equal(c.length, 5)
})

test('legacy votes with null option_id/sequence_index still replay', () => {
  const rows: ReplayVoteRow[] = [
    vote(null, null, {
      option_chosen: 'Agua',
      reasoning: null,
      reasoning_es: 'porque sí',
      persona: persona({
        persona_key: null,
        id: 'uuid-persona-1',
        nse_band: null,
        income_band: 'D/E',
        household_size: null,
        household: 'Vive sola',
        ageb_code: null,
        centroid_lat: null,
        centroid_lng: null,
        grounding: null,
      }),
    }),
    vote(null, null, {
      option_chosen: 'SEGURIDAD',
      reasoning: null,
      reasoning_es: 'otra razón',
      created_at: '2026-08-01T10:00:00.000Z',
      persona: persona({
        persona_key: null,
        id: 'uuid-persona-2',
        nse_band: null,
        income_band: 'C+',
        household_size: null,
        household: 'Pareja sin hijos',
      }),
    }),
  ]

  const payload = buildReplayPayload({
    run: {
      id: 'legacy-run',
      market_id: 'pulse-1',
      status: 'complete',
      mode: 'batch',
      model: 'claude',
      n_agents: 2,
      completed_at: null,
      divergence_index: null,
      divergence_meta: null,
      divergence: {
        id: 42,
        delta_shares: 0.2,
        delta_confidence: 0.1,
        per_option: [],
        computed_at: '2026-08-01T12:00:00.000Z',
      },
      is_fixture: false,
      revealed_at: '2026-08-02T00:00:00.000Z',
    },
    pulse: {
      id: 'pulse-1',
      title: 'Q',
      resolution_date: null,
      status: 'resolved',
    },
    voteRows: rows,
    outcomes,
    totalVotes: 100,
    includeRealAggregates: true,
  })

  assert.equal(payload.votes.length, 2)
  assert.equal(payload.meta?.votesUnmatched, 0)
  assert.equal(payload.meta?.votesResolved, 2)
  // Deterministic shuffle → stable across reloads
  const again = buildReplayPayload({
    run: {
      id: 'legacy-run',
      market_id: 'pulse-1',
      status: 'complete',
      mode: 'batch',
      model: 'claude',
      n_agents: 2,
      completed_at: null,
      divergence_index: null,
      divergence_meta: null,
      divergence: {
        id: 42,
        delta_shares: 0.2,
        delta_confidence: 0.1,
        per_option: [],
        computed_at: '2026-08-01T12:00:00.000Z',
      },
      is_fixture: false,
      revealed_at: '2026-08-02T00:00:00.000Z',
    },
    pulse: {
      id: 'pulse-1',
      title: 'Q',
      resolution_date: null,
      status: 'resolved',
    },
    voteRows: rows,
    outcomes,
    totalVotes: 100,
    includeRealAggregates: true,
  })
  assert.deepEqual(
    payload.votes.map((v) => v.persona.personaKey),
    again.votes.map((v) => v.persona.personaKey),
  )
  assert.deepEqual(
    payload.votes.map((v) => v.sequenceIndex),
    again.votes.map((v) => v.sequenceIndex),
  )

  // reasoning falls back to reasoning_es
  assert.ok(payload.votes.every((v) => typeof v.reasoning === 'string'))

  // persona_key from id; nseBand normalized; household from text
  const p1 = payload.votes.find((v) => v.persona.personaKey === 'uuid-persona-1')!
  assert.equal(p1.persona.nseBand, 'D')
  assert.equal(p1.persona.householdSize, 1)
  assert.equal(p1.persona.sex, 'femenino')
  assert.equal(p1.persona.agebCode, null)
  assert.equal(p1.persona.grounding, undefined)

  // completed_at from latest vote; divergence from legacy jsonb
  assert.equal(payload.run.completedAt, '2026-08-01T10:00:00.000Z')
  assert.equal(payload.run.divergenceIndex, 42)
  assert.deepEqual(payload.run.divergenceMeta, {
    index: 42,
    shareScore: 20,
    confScore: 10,
    computedAt: '2026-08-01T12:00:00.000Z',
  })
})

test('normalizeNseBand maps D/E and E to D', () => {
  assert.equal(normalizeNseBand('D/E'), 'D')
  assert.equal(normalizeNseBand('E'), 'D')
  assert.equal(normalizeNseBand('C+'), 'C+')
  assert.equal(normalizeNseBand(null), null)
})

test('householdSizeFromText derives clear sizes and omits ambiguous text', () => {
  assert.equal(householdSizeFromText('Vive sola'), 1)
  assert.equal(householdSizeFromText('Pareja sin hijos'), 2)
  assert.equal(householdSizeFromText('3 hijos y yo'), 3)
  assert.equal(householdSizeFromText('familia grande en la colonia'), null)
  assert.equal(householdSizeFromText(null), null)
})

test('parseDivergenceMeta accepts legacy and new shapes', () => {
  assert.deepEqual(
    parseDivergenceMeta({
      index: 12,
      shareScore: 10,
      confScore: 15,
      computedAt: '2026-01-01T00:00:00.000Z',
    }),
    {
      index: 12,
      shareScore: 10,
      confScore: 15,
      computedAt: '2026-01-01T00:00:00.000Z',
    },
  )
  assert.deepEqual(
    parseDivergenceMeta({
      id: 30,
      delta_shares: 0.25,
      delta_confidence: 0.5,
      computed_at: '2026-01-02T00:00:00.000Z',
    }),
    {
      index: 30,
      shareScore: 25,
      confScore: 50,
      computedAt: '2026-01-02T00:00:00.000Z',
    },
  )
  assert.equal(parseDivergenceMeta(null), null)
  assert.equal(parseDivergenceMeta({ id: 1 }), null)
})
