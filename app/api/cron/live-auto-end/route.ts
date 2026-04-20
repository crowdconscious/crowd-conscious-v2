import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { runLiveEventCompletedSideEffects } from '@/lib/live-event-completion'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

/**
 * Completes live events whose ends_at is in the past.
 * Vercel cron — Authorization: Bearer CRON_SECRET
 *
 * Every scheduled tick records a row in `cron_job_runs` so the admin
 * `CronHealthTile` stops showing "never_run" on days when there happens to
 * be no expired live event. Without this, the route exits early via an
 * empty `rows` list and nothing is written to the audit table.
 */
const JOB_NAME = 'live-auto-end'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck(JOB_NAME, admin)
  const now = new Date().toISOString()

  try {
    const { data: rows, error: qErr } = await admin
      .from('live_events')
      .select('id, title, total_fund_impact, total_votes_cast, status')
      .eq('status', 'live')
      .not('ends_at', 'is', null)
      .lt('ends_at', now)

    if (qErr) {
      console.error('[cron/live-auto-end]', qErr)
      await cronHealthComplete(runId, JOB_NAME, admin, {
        success: false,
        error: qErr.message,
      })
      return NextResponse.json({ error: qErr.message }, { status: 500 })
    }

    const list = rows ?? []
    let completed = 0

    for (const row of list) {
      const { data: updated, error: upErr } = await admin
        .from('live_events')
        .update({
          status: 'completed',
          ended_at: now,
          updated_at: now,
        })
        .eq('id', row.id)
        .eq('status', 'live')
        .select('id, title, total_fund_impact, total_votes_cast')
        .maybeSingle()

      if (upErr || !updated) continue
      completed++
      void runLiveEventCompletedSideEffects(admin, {
        id: updated.id,
        title: updated.title,
        total_fund_impact: updated.total_fund_impact,
        total_votes_cast: updated.total_votes_cast,
      }).catch((err) => console.error('[cron/live-auto-end] side effects', err))
    }

    await cronHealthComplete(runId, JOB_NAME, admin, {
      success: true,
      summary: `checked=${list.length} completed=${completed}`,
    })
    return NextResponse.json({ ok: true, checked: list.length, completed })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/live-auto-end] fatal', err)
    await cronHealthComplete(runId, JOB_NAME, admin, {
      success: false,
      error: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
