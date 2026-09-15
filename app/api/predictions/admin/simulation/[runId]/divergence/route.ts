export const maxDuration = 300

import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-route-guard'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Compute + store the Divergence Index for a completed run against the CURRENT
 * real Pulse mix (§5.5 item 3 / §5.6). Allowed on open Pulses (live snapshot)
 * and after close. Admin-only; the `pulse-auto-resolve` cron still recomputes
 * on close so the public reveal uses the final mix. Delegates to
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
    if (!result.stored) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
      })
    }
    return NextResponse.json({ ok: true, result: result.divergence })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
