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
 * 2. Poll running Anthropic batches → mark complete / retry
 * 3. Claim queued jobs within concurrency + hourly cost caps → startRun
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
