import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-route-guard'
import { createAdminClient } from '@/lib/supabase-admin'
import type { RunAggregates } from '@/lib/simulation/run'
import type { DivergenceResult } from '@/lib/simulation/divergence'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin-only listing of Pulse Simulation runs (§5.5 item 2/4). Reads the raw
 * `simulation_*` tables through the service-role admin client (RLS bypass, §1.2)
 * — these rows are ADMIN-ONLY here; user-facing surfaces read exclusively via
 * the `revealed_simulation_runs` view (§5.2), never this route.
 *
 * TODO(once migrations 252-254 are applied + `types/database.ts` regenerated):
 * drop the local `SimulationRunListRow` interface and the `as unknown as` cast
 * and lean on the generated `Database` types. Until then the admin client is
 * untyped for `simulation_runs`, so we shape the rows locally (mirroring
 * `lib/simulation/run.ts`'s approach) to keep `tsc --noEmit` clean.
 */

interface SimulationRunListRow {
  id: string
  market_id: string | null
  persona_version: string
  model: string
  prompt_version: string
  n_agents: number
  status: string
  is_brand_pretest: boolean
  question_override: string | null
  aggregates: RunAggregates | null
  divergence: DivergenceResult | null
  revealed_at: string | null
  batch_id: string | null
  created_at: string | null
}

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('simulation_runs')
    .select(
      'id, market_id, persona_version, model, prompt_version, n_agents, status, is_brand_pretest, question_override, aggregates, divergence, revealed_at, batch_id, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const runs = (data ?? []) as unknown as SimulationRunListRow[]

  // Attach market metadata (title + status) for runs tied to a real Pulse so the
  // panel can label rows and know whether divergence is available (market closed).
  // READ-ONLY on `prediction_markets` (§1: real vote data is sacred).
  const marketIds = [
    ...new Set(
      runs.map((r) => r.market_id).filter((id): id is string => typeof id === 'string'),
    ),
  ]
  const marketById = new Map<string, { title: string | null; status: string | null }>()
  if (marketIds.length > 0) {
    const { data: markets } = await admin
      .from('prediction_markets')
      .select('id, title, status')
      .in('id', marketIds)
    for (const m of markets ?? []) {
      const row = m as { id: string; title: string | null; status: string | null }
      marketById.set(row.id, { title: row.title, status: row.status })
    }
  }

  return NextResponse.json({
    runs: runs.map((r) => {
      const market = r.market_id ? marketById.get(r.market_id) ?? null : null
      return {
        id: r.id,
        market_id: r.market_id,
        market_title: market?.title ?? null,
        market_status: market?.status ?? null,
        // A closed Pulse (status 'resolved') has real aggregates to diverge
        // against. Everything else disables the Divergencia action in the UI.
        market_closed: market?.status === 'resolved',
        persona_version: r.persona_version,
        model: r.model,
        prompt_version: r.prompt_version,
        n_agents: r.n_agents,
        status: r.status,
        is_brand_pretest: r.is_brand_pretest,
        question_override: r.question_override,
        aggregates: r.aggregates,
        divergence: r.divergence,
        revealed_at: r.revealed_at,
        batch_id: r.batch_id,
        created_at: r.created_at,
      }
    }),
  })
}
