import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'
import { processAutorunCronTick } from '@/lib/simulation/autorun'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const JOB_NAME = 'simulation-autorun'

/**
 * Pulse Simulation auto-run worker.
 *
 * 1. Backfill open Pulses missing a job row
 * 2. Reclaim jobs stuck in `running` (orphan / stale lease)
 * 3. Poll running Anthropic batches → mark complete / retry
 * 4. Start at most one queued job within concurrency + hourly caps
 *    (attach run id only after startRun succeeds — no orphan claims)
 *
 * Gated by SIM_AUTORUN_ENABLED. Auth: Bearer CRON_SECRET.
 * Never blocks Pulse creation — enqueue is fire-and-forget on publish.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck(JOB_NAME, admin)

  try {
    const summary = await processAutorunCronTick(admin)
    const summaryText = [
      `enabled=${summary.enabled}`,
      `backfill=${summary.backfillEnqueued}`,
      `reclaimed=${summary.reclaimed}`,
      `polled=${summary.polled}`,
      `completed=${summary.completed}`,
      `started=${summary.started}`,
      `failed=${summary.failed}`,
      `retried=${summary.retried}`,
      `skippedCap=${summary.skippedCap}`,
    ].join(' ')

    await cronHealthComplete(runId, JOB_NAME, admin, {
      success: true,
      summary: summaryText,
    })

    return NextResponse.json({ ok: true, ...summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/simulation-autorun]', message)
    await cronHealthComplete(runId, JOB_NAME, admin, {
      success: false,
      error: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
