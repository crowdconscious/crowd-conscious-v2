import { test } from 'node:test'
import assert from 'node:assert/strict'

import { computeDivergence } from '../divergence.ts'
import {
  assembleSimReportData,
  resolveReportDivergenceScore,
} from './assemble.ts'
import {
  REPORT_TZ,
  formatDateEs,
  formatDateTimeEs,
  divergenceUnavailableLabel,
} from './format.ts'
import type { OptionAgg, SimulationReplayPayload } from '../../types/simulation.ts'

function agg(
  optionId: string,
  share: number,
  meanConfidence: number,
  count: number,
): OptionAgg {
  return { optionId, share, meanConfidence, count }
}

function fixturePayload(overrides?: {
  divergenceIndex?: number | null
  realCounts?: number[]
}): SimulationReplayPayload {
  const realCounts = overrides?.realCounts ?? [38, 19, 4, 9, 1]
  const total = realCounts.reduce((s, n) => s + n, 0)
  const options = [
    { id: 'seg', label: 'Seguridad', order: 0 },
    { id: 'mov', label: 'Movilidad', order: 1 },
    { id: 'esp', label: 'Espacio público', order: 2 },
    { id: 'ser', label: 'Servicios urbanos', order: 3 },
    { id: 'tur', label: 'Turista', order: 4 },
  ]
  const simShares = [0.28, 0.72, 0, 0, 0]
  const simCounts = [42, 108, 0, 0, 0]
  return {
    isFixture: false,
    run: {
      id: 'run-1',
      pulseId: 'pulse-1',
      status: 'complete',
      mode: 'batch',
      model: 'claude-haiku-4-5',
      personaCount: 150,
      completedAt: '2026-08-04T18:00:00.000Z',
      divergenceIndex:
        overrides && 'divergenceIndex' in overrides
          ? (overrides.divergenceIndex ?? null)
          : null,
      divergenceMeta: null,
      isFixture: false,
    },
    pulse: {
      id: 'pulse-1',
      question:
        'De cara al Mundial 2026, ¿en qué debería invertir primero la Alcaldía Miguel Hidalgo?',
      closesAt: null,
      status: 'closed',
      locationLabel: 'Miguel Hidalgo',
      options,
    },
    votes: [],
    simAggregates: options.map((o, i) =>
      agg(o.id, simShares[i]!, 5, simCounts[i]!),
    ),
    realAggregates: options.map((o, i) =>
      agg(o.id, realCounts[i]! / total, 5, realCounts[i]!),
    ),
  }
}

test('resolveReportDivergenceScore computes when stored score is null', () => {
  const payload = fixturePayload({ divergenceIndex: null })
  const expected = computeDivergence(
    payload.simAggregates,
    payload.realAggregates!,
  ).index
  const score = resolveReportDivergenceScore({
    storedScore: null,
    hasRealData: true,
    simAggregates: payload.simAggregates,
    realAggregates: payload.realAggregates,
  })
  assert.equal(score, expected)
  assert.ok(score != null && score > 0)
})

test('resolveReportDivergenceScore prefers stored score', () => {
  const payload = fixturePayload()
  const score = resolveReportDivergenceScore({
    storedScore: 42,
    hasRealData: true,
    simAggregates: payload.simAggregates,
    realAggregates: payload.realAggregates,
  })
  assert.equal(score, 42)
})

test('assemble computes index when track has scored outcome but null score', () => {
  const payload = fixturePayload({ divergenceIndex: null })
  const expected = computeDivergence(
    payload.simAggregates,
    payload.realAggregates!,
  ).index
  const data = assembleSimReportData({
    payload,
    track: {
      divergence_score: null,
      has_real_data: true,
      real_vote_count: 71,
      outcome: 'scored',
      simulated_distribution: null,
      real_distribution: null,
    },
  })
  assert.equal(data.divergence.hasRealData, true)
  assert.equal(data.divergence.realVoteCount, 71)
  assert.equal(data.divergence.outcome, 'scored')
  assert.equal(data.divergence.unavailableReason, null)
  assert.equal(data.divergence.score, expected)
})

test('assemble computes index when track row is missing but real votes exist', () => {
  const payload = fixturePayload({ divergenceIndex: null })
  const expected = computeDivergence(
    payload.simAggregates,
    payload.realAggregates!,
  ).index
  const data = assembleSimReportData({ payload, track: null })
  assert.equal(data.divergence.hasRealData, true)
  assert.equal(data.divergence.unavailableReason, null)
  assert.equal(data.divergence.score, expected)
  assert.equal(data.divergence.outcome, 'scored')
})

test('assemble keeps unavailable label when there is no real data', () => {
  const payload = fixturePayload({ divergenceIndex: null, realCounts: [0, 0, 0, 0, 0] })
  payload.realAggregates = payload.realAggregates!.map((a) => ({
    ...a,
    share: 0,
    count: 0,
  }))
  const data = assembleSimReportData({
    payload,
    track: {
      divergence_score: null,
      has_real_data: false,
      real_vote_count: 0,
      outcome: 'no_real_data',
      simulated_distribution: null,
      real_distribution: null,
    },
  })
  assert.equal(data.divergence.hasRealData, false)
  assert.equal(data.divergence.score, null)
  assert.equal(data.divergence.unavailableReason, divergenceUnavailableLabel())
  assert.equal(data.realResultsNote, null)
})

test('assemble does not show all-zero real bars when n real > 0', () => {
  const payload = fixturePayload({ divergenceIndex: null, realCounts: [0, 0, 0, 0, 0] })
  payload.realAggregates = payload.realAggregates!.map((a) => ({
    ...a,
    share: 0,
    count: 0,
  }))
  const data = assembleSimReportData({
    payload,
    track: {
      divergence_score: null,
      has_real_data: true,
      real_vote_count: 2,
      outcome: 'scored',
      simulated_distribution: null,
      real_distribution: null,
    },
  })
  assert.equal(data.divergence.realVoteCount, 2)
  assert.equal(data.real, null)
  assert.ok(data.realResultsNote)
  assert.match(data.realResultsNote!, /2 voto/)
})

test('assemble derives real counts from track shares × n when outcomes are empty', () => {
  const payload = fixturePayload({ divergenceIndex: null, realCounts: [0, 0, 0, 0, 0] })
  payload.realAggregates = payload.realAggregates!.map((a) => ({
    ...a,
    share: 0,
    count: 0,
  }))
  const data = assembleSimReportData({
    payload,
    track: {
      divergence_score: 40,
      has_real_data: true,
      real_vote_count: 2,
      outcome: 'scored',
      simulated_distribution: null,
      real_distribution: {
        option_shares: {
          Seguridad: 0.5,
          Movilidad: 0.5,
          'Espacio público': 0,
          'Servicios urbanos': 0,
          Turista: 0,
        },
        avg_confidence_by_option: {},
      },
    },
  })
  assert.equal(data.realResultsNote, null)
  assert.ok(data.real)
  const seg = data.real!.find((r) => r.label === 'Seguridad')
  const mov = data.real!.find((r) => r.label === 'Movilidad')
  assert.equal(seg?.share, 0.5)
  assert.equal(seg?.count, 1)
  assert.equal(mov?.count, 1)
  const sum = data.real!.reduce((s, r) => s + (r.count || 0), 0)
  assert.equal(sum, 2)
})

test('formatDateTimeEs uses America/Mexico_City', () => {
  // 30 Sep 2026 02:19 UTC = 29 Sep 2026 20:19 CDMX (UTC-6)
  const s = formatDateTimeEs('2026-09-30T02:19:00.000Z')
  assert.match(s, /29/)
  assert.match(s, /sep/i)
  assert.match(s, /2026/)
  assert.match(s, /8:19|20:19/)
  assert.equal(REPORT_TZ, 'America/Mexico_City')
})

test('formatDateEs uses America/Mexico_City (no UTC day shift)', () => {
  // Early UTC morning can be previous calendar day in CDMX.
  const s = formatDateEs('2026-09-01T03:00:00.000Z')
  assert.match(s, /31/)
  assert.match(s, /agosto/i)
})

test('methodology formats completedAt in CDMX, not raw ISO', () => {
  const payload = fixturePayload()
  const data = assembleSimReportData({
    payload,
    runExtras: { personaVersion: 'cdmx-v1', model: 'claude-haiku-4-5' },
  })
  const metaLine = data.methodologyFull.find((l) => l.includes('Fecha de corrida'))
  assert.ok(metaLine)
  assert.doesNotMatch(metaLine!, /T\d{2}:\d{2}:\d{2}/)
  assert.match(metaLine!, /2026/)
})
