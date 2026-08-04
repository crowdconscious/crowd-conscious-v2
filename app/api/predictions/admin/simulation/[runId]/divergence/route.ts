export const maxDuration = 300

import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-route-guard'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Compute + store the Divergence Index for a completed run against the REAL
 * Pulse aggregates (§5.5 item 3 / §5.6). Intended for runs whose market has
 * CLOSED (there must be real votes to compare). Admin-only manual fallback to
 * the `pulse-auto-resolve` hook (which is NOT modified here). Delegates to
 * `computeAndStoreDivergence`; READ-ONLY on real tables, writes ONLY
 * `simulation_runs.divergence`.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { runId } = await context.params
  if (!runId) {
    return NextResponse.json({ error: 'missing runId' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    const { computeAndStoreDivergence } = await import('@/lib/simulation/run')
    const result = await computeAndStoreDivergence(runId, { adminClient: admin })
    return NextResponse.json({ ok: true, result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
