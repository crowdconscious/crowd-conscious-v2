import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { runLiveEventCompletedSideEffects } from '@/lib/live-event-completion'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

/**
 * Completes live events whose ends_at is in the past.
 * Vercel cron — Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: rows, error: qErr } = await admin
    .from('live_events')
    .select('id, title, total_fund_impact, total_votes_cast, status')
    .eq('status', 'live')
    .not('ends_at', 'is', null)
    .lt('ends_at', now)

  if (qErr) {
    console.error('[cron/live-auto-end]', qErr)
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

  return NextResponse.json({ ok: true, checked: list.length, completed })
}
