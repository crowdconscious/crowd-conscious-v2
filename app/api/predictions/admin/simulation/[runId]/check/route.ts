export const maxDuration = 300

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requireAdmin } from '@/lib/admin-route-guard'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Poll a run's Anthropic batch and, once it ends, parse votes → compute
 * aggregates → mark complete (§5.5 item 2). Admin-only. Delegates to
 * `checkRun` in `lib/simulation/run.ts`; writes ONLY to `simulation_*`.
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

  const admin = createAdminClient() as unknown as SupabaseClient

  try {
    const { checkRun } = await import('@/lib/simulation/run')
    const result = await checkRun(runId, { adminClient: admin })
    return NextResponse.json({ ok: true, result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
