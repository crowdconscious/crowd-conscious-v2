import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requireAdmin } from '@/lib/admin-route-guard'
import { createAdminClient } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin-only listing of Pulse Simulation runs (§5.5 item 2/4). Reads the raw
 * `simulation_*` tables through the service-role admin client (RLS bypass, §1.2)
 * — these rows are ADMIN-ONLY here; user-facing surfaces read exclusively via
 * the `revealed_simulation_runs` view (§5.2), never this route.
 */

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  // `createAdminClient()` is created without the `Database` generic
  // (lib/supabase-admin); assert it here so `simulation_runs` rows are typed.
  const admin = createAdminClient() as unknown as SupabaseClient<Database>

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

  const runs = data ?? []

  // Attach market metadata (title + status) for runs tied to a real Pulse so the
  // panel can label rows. Divergence is available on OPEN Pulses too (live mix);
  // `market_closed` is only a label, not a button gate.
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
        // Informational: Pulse has closed. Divergencia no longer requires this —
        // admins can compute against the current live mix on an open Pulse.
        market_closed:
          market?.status === 'resolved' || market?.status === 'closed',
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
