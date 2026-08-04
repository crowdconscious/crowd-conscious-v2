import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-route-guard'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Set or clear a run's `revealed_at` — THE gate (§5.2). During calibration this
 * is a MANUAL admin action (§5.5 item 3; auto-reveal only after Sep 15 + 4 clean
 * cycles, §9). Setting `revealed_at` is the ONLY thing that makes a run visible
 * through the public `revealed_simulation_runs` view; clearing it hides it again.
 *
 * Body: `{ reveal: boolean }` — true → `revealed_at = now()`, false → NULL.
 * Admin-only. Writes ONLY `simulation_runs.revealed_at`.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { runId } = await context.params
  if (!runId) {
    return NextResponse.json({ error: 'missing runId' }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as { reveal?: boolean }
  const revealedAt = body.reveal === false ? null : new Date().toISOString()

  const admin = createAdminClient()
  const { error } = await admin
    .from('simulation_runs')
    .update({ revealed_at: revealedAt })
    .eq('id', runId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, revealed_at: revealedAt })
}
