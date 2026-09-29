import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-route-guard'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  isSimAutorunEnabled,
  rerunAutorunJob,
} from '@/lib/simulation/autorun'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/predictions/admin/simulation-autorun
 * Minimal admin list: each Pulse's auto-run status + stored divergence.
 */
export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()

  const { data: jobs, error } = await admin
    .from('simulation_autorun_jobs')
    .select(
      `
      id,
      market_id,
      status,
      source,
      simulation_run_id,
      attempts,
      max_attempts,
      last_error,
      cost_usd,
      input_tokens,
      output_tokens,
      started_at,
      completed_at,
      created_at,
      updated_at
    `,
    )
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = jobs ?? []
  const marketIds = list.map((j) => j.market_id as string)

  const titleById = new Map<string, string>()
  const statusById = new Map<string, string>()
  const categoryById = new Map<string, string | null>()

  if (marketIds.length > 0) {
    const { data: markets } = await admin
      .from('prediction_markets')
      .select('id, title, status, category')
      .in('id', marketIds)
    for (const m of markets ?? []) {
      titleById.set(m.id as string, m.title as string)
      statusById.set(m.id as string, m.status as string)
      categoryById.set(m.id as string, (m.category as string) ?? null)
    }
  }

  const divergenceByMarket = new Map<
    string,
    {
      divergence_score: number | null
      real_vote_count: number
      has_real_data: boolean
      outcome: string
      computed_at: string
    }
  >()

  if (marketIds.length > 0) {
    const { data: divs } = await admin
      .from('pulse_simulation_divergence')
      .select(
        'market_id, divergence_score, real_vote_count, has_real_data, outcome, computed_at',
      )
      .in('market_id', marketIds)
    for (const d of divs ?? []) {
      divergenceByMarket.set(d.market_id as string, {
        divergence_score:
          d.divergence_score == null ? null : Number(d.divergence_score),
        real_vote_count: Number(d.real_vote_count ?? 0),
        has_real_data: Boolean(d.has_real_data),
        outcome: d.outcome as string,
        computed_at: d.computed_at as string,
      })
    }
  }

  const rows = list.map((j) => {
    const marketId = j.market_id as string
    const div = divergenceByMarket.get(marketId) ?? null
    return {
      id: j.id,
      marketId,
      title: titleById.get(marketId) ?? '(sin título)',
      pulseStatus: statusById.get(marketId) ?? null,
      category: categoryById.get(marketId) ?? null,
      status: j.status as string,
      source: j.source as string,
      simulationRunId: (j.simulation_run_id as string | null) ?? null,
      attempts: j.attempts as number,
      maxAttempts: j.max_attempts as number,
      lastError: (j.last_error as string | null) ?? null,
      costUsd: j.cost_usd == null ? null : Number(j.cost_usd),
      inputTokens: (j.input_tokens as number | null) ?? null,
      outputTokens: (j.output_tokens as number | null) ?? null,
      startedAt: (j.started_at as string | null) ?? null,
      completedAt: (j.completed_at as string | null) ?? null,
      updatedAt: j.updated_at as string,
      divergence: div
        ? {
            score: div.has_real_data ? div.divergence_score : null,
            realVoteCount: div.real_vote_count,
            hasRealData: div.has_real_data,
            outcome: div.outcome,
            computedAt: div.computed_at,
          }
        : null,
    }
  })

  return NextResponse.json({
    ok: true,
    enabled: isSimAutorunEnabled(),
    rows,
  })
}

/**
 * POST /api/predictions/admin/simulation-autorun
 * Body: { marketId } — reset/queue a re-run for that Pulse.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  if (!isSimAutorunEnabled()) {
    return NextResponse.json(
      { error: 'SIM_AUTORUN_ENABLED is not true' },
      { status: 400 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    marketId?: string
  }
  const marketId =
    typeof body.marketId === 'string' ? body.marketId.trim() : ''
  if (!marketId) {
    return NextResponse.json({ error: 'marketId required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: market } = await admin
    .from('prediction_markets')
    .select('id, is_pulse')
    .eq('id', marketId)
    .maybeSingle()

  if (!market || !(market as { is_pulse?: boolean }).is_pulse) {
    return NextResponse.json({ error: 'Pulse not found' }, { status: 404 })
  }

  try {
    const { jobId } = await rerunAutorunJob(admin, marketId)
    return NextResponse.json({ ok: true, jobId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
