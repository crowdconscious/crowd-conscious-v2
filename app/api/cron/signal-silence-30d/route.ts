import { NextRequest, NextResponse } from 'next/server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'
import { notifySignalSilencePublished } from '@/lib/resolution-notify'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Phase 2 — publish institutional silence as a public result.
 *
 * A señal that reached stage 1 (formal request sent) with no
 * citizen_signal_responses after 30 days gets silence_published_at stamped
 * once, then author + co-signers get a resolution notification (daily cap
 * via resolution_notify_log).
 *
 * Schedule: daily 07:00 UTC (vercel.json).
 */

const JOB_NAME = 'signal-silence-30d'
const MS_30D = 30 * 24 * 60 * 60 * 1000
const ROW_LIMIT = 100

type SilenceCandidate = {
  id: string
  public_slug: string
  title: string
  stage1_met_at: string
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSignalsAdminClient()
  const { runId } = await cronHealthCheck(JOB_NAME, admin)

  const cutoffIso = new Date(Date.now() - MS_30D).toISOString()
  let stamped = 0
  let notified = 0
  const errors: string[] = []

  try {
    const { data: rows, error: queryErr } = await admin
      .from('citizen_signals')
      .select('id, public_slug, title, stage1_met_at')
      .eq('publication_status', 'published')
      .gte('threshold_stage', 1)
      .is('silence_published_at', null)
      .not('stage1_met_at', 'is', null)
      .lte('stage1_met_at', cutoffIso)
      .order('stage1_met_at', { ascending: true })
      .limit(ROW_LIMIT)

    if (queryErr) {
      throw new Error(`silence query: ${queryErr.message}`)
    }

    for (const row of (rows ?? []) as SilenceCandidate[]) {
      try {
        // Skip if any official response exists.
        const { count, error: respErr } = await admin
          .from('citizen_signal_responses')
          .select('id', { count: 'exact', head: true })
          .eq('signal_id', row.id)

        if (respErr) {
          throw new Error(`responses check: ${respErr.message}`)
        }
        if ((count ?? 0) > 0) continue

        const nowIso = new Date().toISOString()
        const { data: updated, error: updErr } = await admin
          .from('citizen_signals')
          .update({ silence_published_at: nowIso })
          .eq('id', row.id)
          .is('silence_published_at', null)
          .select('id')
          .maybeSingle()

        if (updErr) {
          throw new Error(`stamp silence: ${updErr.message}`)
        }
        if (!updated) continue

        stamped++

        console.info('[ux-overhaul-analytics]', {
          event: 'signal_no_response_30d',
          surface: 'web',
          object_id: row.id,
          recipient: 'author_and_cosigners',
          timestamp: nowIso,
        })

        const result = await notifySignalSilencePublished(admin, {
          signalId: row.id,
          slug: row.public_slug,
          title: row.title,
        })
        notified += result.sentPush + result.sentEmail + result.inAppOnly
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[cron/signal-silence-30d] signal failed', row.id, message)
        errors.push(`${row.id}: ${message}`)
      }
    }

    await cronHealthComplete(runId, JOB_NAME, admin, {
      success: errors.length === 0,
      summary: `stamped=${stamped} notified=${notified} errors=${errors.length}`,
      error: errors.length ? errors.join('; ') : undefined,
    })

    return NextResponse.json({
      ok: true,
      stamped,
      notified,
      errors: errors.length ? errors : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await cronHealthComplete(runId, JOB_NAME, admin, {
      success: false,
      error: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
