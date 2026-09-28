import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSimulationViewerHref,
  pickDefaultSimulationRun,
  runHasStoredDivergenceScore,
  simulationReplayCacheControl,
  type DefaultRunCandidate,
} from './pick-default-run.ts'
import { decideReplayAccess } from './access.ts'
import { resolveDivergence } from './build-replay.ts'
import type { ReplayRunRow } from './build-replay.ts'

function run(
  over: Partial<DefaultRunCandidate> & Pick<DefaultRunCandidate, 'id'>,
): DefaultRunCandidate {
  return {
    created_at: '2026-09-01T00:00:00.000Z',
    status: 'complete',
    divergence_index: null,
    is_fixture: false,
    is_brand_pretest: false,
    ...over,
  }
}

test('pickDefaultSimulationRun: prefers scored run over newer unscored run', () => {
  const newerUnscored = run({
    id: 'newer-unscored',
    created_at: '2026-09-20T00:00:00.000Z',
    divergence_index: null,
  })
  const olderScored = run({
    id: 'older-scored',
    created_at: '2026-09-10T00:00:00.000Z',
    divergence_index: 29,
  })
  const picked = pickDefaultSimulationRun([newerUnscored, olderScored])
  assert.equal(picked?.id, 'older-scored')
})

test('pickDefaultSimulationRun: among scored runs, picks most recent', () => {
  const older = run({
    id: 'old-scored',
    created_at: '2026-09-01T00:00:00.000Z',
    divergence_index: 10,
  })
  const newer = run({
    id: 'new-scored',
    created_at: '2026-09-15T00:00:00.000Z',
    divergence_index: 29,
  })
  assert.equal(pickDefaultSimulationRun([older, newer])?.id, 'new-scored')
})

test('pickDefaultSimulationRun: falls back to newest complete when none scored', () => {
  const older = run({
    id: 'old',
    created_at: '2026-09-01T00:00:00.000Z',
    divergence_index: null,
  })
  const newer = run({
    id: 'new',
    created_at: '2026-09-20T00:00:00.000Z',
    divergence_index: null,
  })
  assert.equal(pickDefaultSimulationRun([older, newer])?.id, 'new')
})

test('pickDefaultSimulationRun: skips fixtures and brand pretests', () => {
  const fixtureScored = run({
    id: 'fixture',
    created_at: '2026-09-25T00:00:00.000Z',
    divergence_index: 50,
    is_fixture: true,
  })
  const pretestScored = run({
    id: 'pretest',
    created_at: '2026-09-24T00:00:00.000Z',
    divergence_index: 40,
    is_brand_pretest: true,
  })
  const realScored = run({
    id: 'real',
    created_at: '2026-09-01T00:00:00.000Z',
    divergence_index: 29,
  })
  assert.equal(
    pickDefaultSimulationRun([fixtureScored, pretestScored, realScored])?.id,
    'real',
  )
})

test('pickDefaultSimulationRun: skips incomplete status', () => {
  const running = run({
    id: 'running',
    status: 'running',
    created_at: '2026-09-25T00:00:00.000Z',
    divergence_index: 99,
  })
  const complete = run({
    id: 'done',
    created_at: '2026-09-01T00:00:00.000Z',
    divergence_index: 29,
  })
  assert.equal(pickDefaultSimulationRun([running, complete])?.id, 'done')
})

test('pickDefaultSimulationRun: genuine computed 0 counts as scored', () => {
  const zero = run({
    id: 'zero',
    created_at: '2026-09-01T00:00:00.000Z',
    divergence_index: 0,
  })
  const newerNull = run({
    id: 'null',
    created_at: '2026-09-20T00:00:00.000Z',
    divergence_index: null,
  })
  assert.equal(pickDefaultSimulationRun([newerNull, zero])?.id, 'zero')
})

test('runHasStoredDivergenceScore: accepts legacy jsonb when column is null', () => {
  assert.equal(
    runHasStoredDivergenceScore({
      divergence_index: null,
      divergence: {
        id: 29,
        delta_shares: 0.12,
        delta_confidence: 0.08,
        computed_at: '2026-09-01T00:00:00.000Z',
      },
    }),
    true,
  )
  assert.equal(
    runHasStoredDivergenceScore({
      divergence_index: null,
      divergence: { id: 0 },
    }),
    false,
  )
})

test('pickDefaultSimulationRun: prefers legacy-scored over newer null column', () => {
  const newer = run({
    id: 'newer',
    created_at: '2026-09-20T00:00:00.000Z',
    divergence_index: null,
  })
  const legacy = run({
    id: 'legacy',
    created_at: '2026-09-10T00:00:00.000Z',
    divergence_index: null,
    divergence: {
      id: 29,
      delta_shares: 0.1,
      delta_confidence: 0.1,
      computed_at: '2026-09-10T00:00:00.000Z',
    },
  })
  assert.equal(pickDefaultSimulationRun([newer, legacy])?.id, 'legacy')
})

test('pickDefaultSimulationRun: empty / only ineligible → null', () => {
  assert.equal(pickDefaultSimulationRun([]), null)
  assert.equal(
    pickDefaultSimulationRun([
      run({ id: 'f', is_fixture: true, divergence_index: 1 }),
    ]),
    null,
  )
})

test('buildSimulationViewerHref pins runId', () => {
  assert.equal(
    buildSimulationViewerHref('pulse-1', 'run-2'),
    '/pulse/pulse-1/simulacion?runId=run-2',
  )
})

test('simulationReplayCacheControl: long TTL only for explicit runId + score', () => {
  const long = simulationReplayCacheControl({
    cachePublic: true,
    hasExplicitRunId: true,
    divergenceIndex: 29,
  })
  assert.match(long, /s-maxage=86400/)

  const shortDefault = simulationReplayCacheControl({
    cachePublic: true,
    hasExplicitRunId: false,
    divergenceIndex: 29,
  })
  assert.match(shortDefault, /s-maxage=60/)

  const shortUnscored = simulationReplayCacheControl({
    cachePublic: true,
    hasExplicitRunId: true,
    divergenceIndex: null,
  })
  assert.match(shortUnscored, /s-maxage=60/)

  assert.equal(
    simulationReplayCacheControl({
      cachePublic: false,
      hasExplicitRunId: true,
      divergenceIndex: 29,
    }),
    'private, no-store',
  )
})

// ---------------------------------------------------------------------------
// Anonymous closed-pulse access still returns divergence when the run has one
// ---------------------------------------------------------------------------

test('anonymous closed+revealed access: divergence index is not stripped', () => {
  const decision = decideReplayAccess({
    isAdmin: false,
    includeRealParam: false,
    pulseStatus: 'resolved',
    runRevealedAt: '2026-09-01T00:00:00.000Z',
    runIsFixture: false,
    publicClosedEnabled: true,
  })
  assert.equal(decision.allow, true)
  if (!decision.allow) return
  assert.equal(decision.includeRealAggregates, true)

  const runRow: ReplayRunRow = {
    id: 'run-scored',
    market_id: 'pulse-1',
    status: 'complete',
    mode: 'full',
    model: 'test',
    n_agents: 10,
    completed_at: '2026-09-01T00:00:00.000Z',
    divergence_index: 29,
    divergence_meta: null,
    is_fixture: false,
    revealed_at: '2026-09-01T00:00:00.000Z',
  }
  const { index } = resolveDivergence(runRow)
  assert.equal(index, 29)
})
