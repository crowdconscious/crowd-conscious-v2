import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendLiveMatchStartingSoonEmail } from '@/lib/live-event-emails'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

/**
 * Sends "match in ~1 hour" to opted-in users. Idempotent via live_events.reminder_1h_sent_at.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck('live-reminders', admin)

  try {
    const now = new Date()
    const start = new Date(now.getTime() + 55 * 60 * 1000)
    const end = new Date(now.getTime() + 65 * 60 * 1000)

    const { data: events, error: evErr } = await admin
      .from('live_events')
      .select('id, title, match_date, reminder_1h_sent_at')
      .eq('status', 'scheduled')
      .is('reminder_1h_sent_at', null)
      .gte('match_date', start.toISOString())
      .lte('match_date', end.toISOString())

    if (evErr) {
      await cronHealthComplete(runId, 'live-reminders', admin, {
        success: false,
        error: evErr.message,
      })
      return NextResponse.json({ error: 'events' }, { status: 500 })
    }

    if (!events?.length) {
      await cronHealthComplete(runId, 'live-reminders', admin, {
        success: true,
        summary: 'no_upcoming_windows',
      })
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const { data: profiles, error: pErr } = await admin
      .from('profiles')
      .select('id, email, email_notifications')
      .not('email', 'is', null)

    if (pErr) {
      await cronHealthComplete(runId, 'live-reminders', admin, {
        success: false,
        error: pErr.message,
      })
      return NextResponse.json({ error: 'profiles' }, { status: 500 })
    }

    let emails = 0
    for (const ev of events) {
      const matchDateLocal = new Date(ev.match_date).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
      const liveUrl = `${APP_URL}/live/${ev.id}`

      for (const p of profiles ?? []) {
        if (p.email_notifications === false) continue
        const to = (p.email as string)?.trim()
        if (!to) continue
        await sendLiveMatchStartingSoonEmail(to, {
          eventTitle: ev.title,
          matchDateLocal,
          liveUrl,
          locale: 'en',
        })
        emails += 1
        await new Promise((r) => setTimeout(r, 40))
      }

      await admin
        .from('live_events')
        .update({ reminder_1h_sent_at: new Date().toISOString() })
        .eq('id', ev.id)
    }

    await cronHealthComplete(runId, 'live-reminders', admin, {
      success: true,
      summary: `events=${events.length}, emails=${emails}`,
    })

    return NextResponse.json({ ok: true, events: events.length, emails })
  } catch (e) {
    console.error('[cron live-reminders]', e)
    await cronHealthComplete(runId, 'live-reminders', admin, {
      success: false,
      error: e instanceof Error ? e.message : 'unknown',
    })
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
