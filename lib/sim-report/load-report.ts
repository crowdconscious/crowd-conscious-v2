/**
 * Server loader for simulation PDF report data (DB → SimReportData).
 * Service-role only. Never fabricates divergence / vote counts.
 */

import { createAdminClient } from '@/lib/supabase-admin'
import {
  buildReplayPayload,
  type ReplayOutcomeRow,
  type ReplayPersonaRow,
  type ReplayPulseRow,
  type ReplayRunRow,
  type ReplayVoteRow,
} from '@/lib/sim-viewer/build-replay'
import { pickDefaultSimulationRun } from '@/lib/sim-viewer/pick-default-run'
import { assembleSimReportData, type TrackDivergenceRow } from './assemble.ts'
import { renderSimMapSnapshotPng } from './map-snapshot.ts'
import type { SimReportData } from './types.ts'
import type { SimReportTier } from './access.ts'

const DEFAULT_RUN_CANDIDATE_LIMIT = 50

const RUN_SELECT =
  'id, market_id, status, mode, model, n_agents, completed_at, divergence_index, divergence_meta, divergence, is_fixture, revealed_at, created_at, is_brand_pretest, persona_version'

export type LoadedSimReport = {
  data: SimReportData
  pulseStatus: string
  runRevealedAt: string | null
  runIsFixture: boolean
  runId: string
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

/**
 * Load + assemble report data for a Pulse. Returns null when the Pulse/run
 * cannot be found. Does NOT apply access gates — caller must.
 */
export async function loadSimReportData(args: {
  marketId: string
  runId?: string | null
  tier: SimReportTier
  includeMap: boolean
}): Promise<LoadedSimReport | null> {
  if (!isUuid(args.marketId)) return null
  if (args.runId && !isUuid(args.runId)) return null

  const admin = createAdminClient()

  const { data: pulseRaw, error: pulseErr } = await admin
    .from('prediction_markets')
    .select(
      'id, title, resolution_date, status, total_votes, is_pulse, category, market_type',
    )
    .eq('id', args.marketId)
    .maybeSingle()

  if (pulseErr || !pulseRaw) return null

  const pulseRow = pulseRaw as ReplayPulseRow & {
    total_votes: number | null
    is_pulse: boolean | null
    category: string | null
    market_type: string | null
  }

  const legacyPulse =
    !pulseRow.is_pulse &&
    pulseRow.category !== 'pulse' &&
    pulseRow.market_type === 'multi' &&
    pulseRow.category === 'government'

  const showPulse =
    pulseRow.is_pulse === true ||
    pulseRow.category === 'pulse' ||
    legacyPulse

  if (!showPulse) return null

  type RunRow = ReplayRunRow & {
    created_at: string
    is_brand_pretest?: boolean | null
    persona_version?: string | null
  }

  let run: RunRow | null = null

  if (args.runId) {
    const { data: runRaw, error: runErr } = await admin
      .from('simulation_runs')
      .select(RUN_SELECT)
      .eq('market_id', args.marketId)
      .eq('id', args.runId)
      .maybeSingle()
    if (runErr || !runRaw) return null
    run = runRaw as RunRow
  } else {
    const { data: candidates, error: runErr } = await admin
      .from('simulation_runs')
      .select(RUN_SELECT)
      .eq('market_id', args.marketId)
      .eq('status', 'complete')
      .or('is_brand_pretest.eq.false,is_brand_pretest.is.null')
      .order('created_at', { ascending: false })
      .limit(DEFAULT_RUN_CANDIDATE_LIMIT)
    if (runErr || !candidates || candidates.length === 0) return null
    run = pickDefaultSimulationRun(candidates as RunRow[]) as RunRow | null
    if (!run) return null
  }

  if (run.market_id !== args.marketId) return null
  if (run.status !== 'complete') return null

  const { data: outcomesRaw, error: outcomesErr } = await admin
    .from('market_outcomes')
    .select(
      'id, label, sort_order, vote_count, total_confidence, confident_pick_count',
    )
    .eq('market_id', args.marketId)
    .order('sort_order', { ascending: true })

  if (outcomesErr || !outcomesRaw) return null
  const outcomes = outcomesRaw as ReplayOutcomeRow[]

  const { data: votesRaw, error: votesErr } = await admin
    .from('simulation_votes')
    .select(
      `
      sequence_index,
      option_id,
      option_chosen,
      confidence,
      reasoning,
      reasoning_es,
      created_at,
      persona:simulation_personas (
        id,
        persona_key,
        alcaldia,
        colonia,
        ageb_code,
        centroid_lat,
        centroid_lng,
        nse_band,
        income_band,
        age,
        gender,
        education,
        occupation,
        household_size,
        household,
        persona_narrative,
        grounding
      )
    `,
    )
    .eq('run_id', run.id)
    .order('created_at', { ascending: true })

  if (votesErr) return null

  const voteRows: ReplayVoteRow[] = (votesRaw ?? []).map((row) => {
    const r = row as {
      sequence_index: number | null
      option_id: string | null
      option_chosen: string | null
      confidence: number
      reasoning: string | null
      reasoning_es: string | null
      created_at: string | null
      persona: ReplayPersonaRow | ReplayPersonaRow[] | null
    }
    const persona = Array.isArray(r.persona) ? (r.persona[0] ?? null) : r.persona
    return {
      sequence_index: r.sequence_index,
      option_id: r.option_id,
      option_chosen: r.option_chosen,
      confidence: r.confidence,
      reasoning: r.reasoning,
      reasoning_es: r.reasoning_es,
      created_at: r.created_at,
      persona,
    }
  })

  const pulse: ReplayPulseRow = {
    id: pulseRow.id,
    title: pulseRow.title,
    resolution_date: pulseRow.resolution_date,
    status: pulseRow.status,
  }

  const payload = buildReplayPayload({
    run,
    pulse,
    voteRows,
    outcomes,
    totalVotes: pulseRow.total_votes ?? 0,
    includeRealAggregates: true,
  })

  const { data: trackRaw } = await admin
    .from('pulse_simulation_divergence')
    .select(
      'divergence_score, has_real_data, real_vote_count, outcome, simulated_distribution, real_distribution',
    )
    .eq('market_id', args.marketId)
    .maybeSingle()

  const track = (trackRaw as TrackDivergenceRow | null) ?? null

  let mapPng: Buffer | null = null
  const assembledBase = assembleSimReportData({
    payload,
    track,
    runExtras: {
      personaVersion: run.persona_version ?? null,
      model: run.model,
    },
  })
  assembledBase.run.revealedAt = run.revealed_at

  if (args.includeMap && args.tier === 'full') {
    mapPng = await renderSimMapSnapshotPng({
      runId: run.id,
      personas: assembledBase.personas,
      options: assembledBase.simulated,
    })
  }

  const data: SimReportData = {
    ...assembledBase,
    mapPng,
  }

  return {
    data,
    pulseStatus: pulseRow.status,
    runRevealedAt: run.revealed_at,
    runIsFixture: run.is_fixture === true,
    runId: run.id,
  }
}
