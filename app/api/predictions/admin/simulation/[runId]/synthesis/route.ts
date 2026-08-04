export const maxDuration = 300

import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-route-guard'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Generate the optional per-run synthesis (§5.5 item 4 / §5.4): one Sonnet call
 * over the run's aggregates + sampled reasonings, stored to
 * `aggregates.synthesis`. Admin-only. Delegates to `runSynthesis` in
 * `lib/simulation/run.ts`; writes ONLY to `simulation_runs`.
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
    const { runSynthesis } = await import('@/lib/simulation/run')
    const result = await runSynthesis(runId, { adminClient: admin })
    return NextResponse.json({ ok: true, result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
