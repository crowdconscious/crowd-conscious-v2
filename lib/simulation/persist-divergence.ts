/**
 * Durable simulated-vs-real divergence track record per Pulse.
 *
 * Written on Pulse close (pulse-auto-resolve). Always stores `real_vote_count`
 * (n). When there are zero real votes, outcome = 'no_real_data' and
 * divergence_score is NULL — never a fake 0 (viewer shows "—" for missing).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type { AggregateSnapshot, DivergenceResult } from '@/lib/simulation/divergence'

// Service-role client from createAdminClient() is untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any>

export type DivergenceTrackOutcome =
  | 'scored'
  | 'no_real_data'
  | 'multi_select_unsupported'
  | 'no_sim_run'

export type DivergenceDistribution = {
  option_shares: Record<string, number>
  avg_confidence_by_option: Record<string, number>
}

export type PersistDivergenceInput = {
  marketId: string
  simulationRunId: string | null
  category: string | null
  subcategory: string | null
  simulated: DivergenceDistribution | null
  real: DivergenceDistribution | null
  realVoteCount: number
  divergenceScore: number | null
  outcome: DivergenceTrackOutcome
}

function asJson(value: unknown): Json {
  return value as Json
}

function snapshotToDistribution(
  snap: AggregateSnapshot | null | undefined,
): DivergenceDistribution | null {
  if (!snap) return null
  return {
    option_shares: { ...snap.option_shares },
    avg_confidence_by_option: { ...snap.avg_confidence_by_option },
  }
}

/**
 * Upsert the durable track row for one Pulse. UNIQUE(market_id) — a second
 * close pass overwrites in place (same as sponsor report).
 */
export async function upsertPulseDivergenceRecord(
  admin: AdminClient,
  input: PersistDivergenceInput,
): Promise<void> {
  const now = new Date().toISOString()
  const row: Database['public']['Tables']['pulse_simulation_divergence']['Insert'] =
    {
      market_id: input.marketId,
      simulation_run_id: input.simulationRunId,
      category: input.category,
      subcategory: input.subcategory,
      simulated_distribution: input.simulated
        ? asJson(input.simulated)
        : null,
      real_distribution: input.real ? asJson(input.real) : null,
      real_vote_count: Math.max(0, Math.floor(input.realVoteCount)),
      divergence_score:
        input.outcome === 'scored' && input.divergenceScore != null
          ? input.divergenceScore
          : null,
      has_real_data: input.outcome === 'scored' || input.realVoteCount > 0,
      outcome: input.outcome,
      computed_at: now,
    }

  // For no_real_data, has_real_data must be false even if someone passes count>0 by mistake.
  if (input.outcome === 'no_real_data') {
    row.has_real_data = false
    row.divergence_score = null
    row.real_distribution = null
    row.real_vote_count = 0
  }

  const { error } = await admin.from('pulse_simulation_divergence').upsert(row, {
    onConflict: 'market_id',
  })
  if (error) {
    throw new Error(`upsertPulseDivergenceRecord: ${error.message}`)
  }
}

/**
 * On Pulse close: recompute sim-run divergence (existing path) AND upsert the
 * durable track record. Prefer the autorun job's run when present; else the
 * newest complete non-brand run.
 *
 * Never writes a fake score of 0 when there are no real votes.
 */
export async function persistDivergenceOnPulseClose(
  admin: AdminClient,
  marketId: string,
): Promise<{ outcome: DivergenceTrackOutcome; runId: string | null }> {
  const { data: market, error: mErr } = await admin
    .from('prediction_markets')
    .select('id, category, subcategory, vote_mode')
    .eq('id', marketId)
    .maybeSingle()

  if (mErr) throw new Error(`persistDivergenceOnPulseClose market: ${mErr.message}`)
  if (!market) throw new Error(`persistDivergenceOnPulseClose: market ${marketId} not found`)

  const category = (market.category as string | null) ?? null
  const subcategory = (market.subcategory as string | null) ?? null
  const voteMode = (market as { vote_mode?: string }).vote_mode

  if (voteMode === 'multi') {
    await upsertPulseDivergenceRecord(admin, {
      marketId,
      simulationRunId: null,
      category,
      subcategory,
      simulated: null,
      real: null,
      realVoteCount: 0,
      divergenceScore: null,
      outcome: 'multi_select_unsupported',
    })
    return { outcome: 'multi_select_unsupported', runId: null }
  }

  // Prefer the autorun job's run, else newest complete non-brand run.
  let runId: string | null = null
  const { data: autorun } = await admin
    .from('simulation_autorun_jobs')
    .select('simulation_run_id, status')
    .eq('market_id', marketId)
    .maybeSingle()

  if (
    autorun &&
    (autorun as { status?: string }).status === 'complete' &&
    (autorun as { simulation_run_id?: string | null }).simulation_run_id
  ) {
    runId = (autorun as { simulation_run_id: string }).simulation_run_id
  }

  if (!runId) {
    const { data: runs } = await admin
      .from('simulation_runs')
      .select('id')
      .eq('market_id', marketId)
      .eq('status', 'complete')
      .eq('is_brand_pretest', false)
      .eq('is_fixture', false)
      .order('created_at', { ascending: false })
      .limit(1)
    runId = (runs?.[0] as { id?: string } | undefined)?.id ?? null
  }

  if (!runId) {
    const realVoteCount = await countRealVotes(admin, marketId)
    await upsertPulseDivergenceRecord(admin, {
      marketId,
      simulationRunId: null,
      category,
      subcategory,
      simulated: null,
      real: null,
      realVoteCount,
      divergenceScore: null,
      outcome: realVoteCount > 0 ? 'no_sim_run' : 'no_real_data',
    })
    // If there are real votes but no sim, still mark no_sim_run (not no_real_data).
    if (realVoteCount === 0) {
      return { outcome: 'no_real_data', runId: null }
    }
    return { outcome: 'no_sim_run', runId: null }
  }

  // Always recompute + store on simulation_runs (existing public reveal path).
  const { computeAndStoreDivergence } = await import('@/lib/simulation/run')
  const storeResult = await computeAndStoreDivergence(runId, {
    adminClient: admin,
  })

  const { data: runRow } = await admin
    .from('simulation_runs')
    .select('aggregates, divergence')
    .eq('id', runId)
    .maybeSingle()

  const { toAggregateSnapshot } = await import('@/lib/simulation/run')
  const aggregatesRaw = (runRow as { aggregates?: unknown } | null)?.aggregates
  let simulated: DivergenceDistribution | null = null
  if (aggregatesRaw && typeof aggregatesRaw === 'object') {
    const a = aggregatesRaw as {
      option_shares?: Record<string, number>
      confidence_weighted_shares?: Record<string, number>
      avg_confidence_by_option?: Record<string, number>
    }
    if (a.option_shares && a.avg_confidence_by_option) {
      const aligned = toAggregateSnapshot({
        option_shares: a.option_shares,
        confidence_weighted_shares: a.confidence_weighted_shares ?? {},
        avg_confidence_by_option: a.avg_confidence_by_option,
      })
      simulated = snapshotToDistribution(aligned)
    }
  }
  const realVoteCount = await countRealVotes(admin, marketId)

  if (!storeResult.stored) {
    if (storeResult.reason === 'multi_select_unsupported') {
      await upsertPulseDivergenceRecord(admin, {
        marketId,
        simulationRunId: runId,
        category,
        subcategory,
        simulated,
        real: null,
        realVoteCount,
        divergenceScore: null,
        outcome: 'multi_select_unsupported',
      })
      return { outcome: 'multi_select_unsupported', runId }
    }

    // no_real_votes — durable row with NULL score, never fake 0
    await upsertPulseDivergenceRecord(admin, {
      marketId,
      simulationRunId: runId,
      category,
      subcategory,
      simulated,
      real: null,
      realVoteCount: 0,
      divergenceScore: null,
      outcome: 'no_real_data',
    })
    return { outcome: 'no_real_data', runId }
  }

  const divergence = storeResult.divergence as DivergenceResult
  const real = await readRealDistribution(admin, marketId)

  // Also denormalize viewer columns when we have a score (helps admin list).
  await admin
    .from('simulation_runs')
    .update({
      divergence_index: divergence.id,
      divergence_meta: asJson({
        index: divergence.id,
        shareScore: divergence.delta_shares * 100,
        confScore: divergence.delta_confidence * 100,
        computedAt: divergence.computed_at ?? new Date().toISOString(),
      }),
    })
    .eq('id', runId)

  await upsertPulseDivergenceRecord(admin, {
    marketId,
    simulationRunId: runId,
    category,
    subcategory,
    simulated,
    real,
    realVoteCount,
    divergenceScore: divergence.id,
    outcome: 'scored',
  })

  return { outcome: 'scored', runId }
}

async function countRealVotes(
  admin: AdminClient,
  marketId: string,
): Promise<number> {
  const { count, error } = await admin
    .from('market_votes')
    .select('id', { count: 'exact', head: true })
    .eq('market_id', marketId)
  if (error) throw new Error(`countRealVotes: ${error.message}`)
  return count ?? 0
}

async function readRealDistribution(
  admin: AdminClient,
  marketId: string,
): Promise<DivergenceDistribution | null> {
  // Reuse the same aggregate math as computeAndStoreDivergence via a tiny
  // internal re-read: load outcomes + votes and build shares the same way
  // the engine does (confidence-weighted via computeAggregateSnapshot).
  const { computeAggregateSnapshot, toAggregateSnapshot } = await import(
    '@/lib/simulation/run'
  )

  const { data: outcomes, error: oErr } = await admin
    .from('market_outcomes')
    .select('id, label')
    .eq('market_id', marketId)
  if (oErr) throw new Error(`readRealDistribution outcomes: ${oErr.message}`)

  const labelById = new Map<string, string>()
  for (const o of outcomes ?? []) {
    labelById.set(o.id as string, o.label as string)
  }

  const { data: votes, error: vErr } = await admin
    .from('market_votes')
    .select('outcome_id, confidence, created_at')
    .eq('market_id', marketId)
  if (vErr) throw new Error(`readRealDistribution votes: ${vErr.message}`)

  if (!votes || votes.length === 0) return null

  const snapshot = computeAggregateSnapshot(
    votes.map((v) => ({
      outcome_id: labelById.get(v.outcome_id as string) ?? (v.outcome_id as string),
      confidence: (v.confidence as number | null) ?? null,
      created_at: v.created_at as string,
    })),
  )

  // Store the same confidence-weighted share shape divergence compared.
  const aligned = toAggregateSnapshot(snapshot)
  return {
    option_shares: { ...aligned.option_shares },
    avg_confidence_by_option: { ...aligned.avg_confidence_by_option },
  }
}
