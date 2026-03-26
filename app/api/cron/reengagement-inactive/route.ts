import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/resend'
import { reengagementInactiveTemplate, type ReengagementMarket } from '@/lib/prediction-emails'
import { createUnsubscribeToken } from '@/lib/email-unsubscribe'
import { getMarketYesPercentForCard } from '@/lib/market-email-helpers'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

const MS_7D = 7 * 24 * 60 * 60 * 1000
const MS_14D = 14 * 24 * 60 * 60 * 1000

/**
 * Vercel cron: Monday — see vercel.json for UTC time.
 * Users with no vote in the last 7 days; up to 3 markets they have not voted on
 * and have not been emailed in the last 14 days (same cooldown as daily digest).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck('reengagement-inactive', admin)

  try {
    const cutoffIso = new Date(Date.now() - MS_7D).toISOString()
    const since14d = new Date(Date.now() - MS_14D).toISOString()

    const { data: recentVotes } = await admin
      .from('market_votes')
      .select('user_id')
      .gte('created_at', cutoffIso)

    const recentlyActive = new Set((recentVotes ?? []).map((v) => v.user_id))

    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, email, email_notifications')
      .not('email', 'is', null)

    if (profErr) {
      console.error('[reengagement] profiles', profErr)
      await cronHealthComplete(runId, 'reengagement-inactive', admin, {
        success: false,
        error: profErr.message,
      })
      return NextResponse.json({ error: 'profiles_fetch' }, { status: 500 })
    }

    const candidates = (profiles ?? []).filter(
      (p) => p.email_notifications !== false && recentlyActive.has(p.id) === false
    )

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const p of candidates) {
      const email = (p.email as string)?.trim()
      if (!email) continue

      const { data: votedRows } = await admin.from('market_votes').select('market_id').eq('user_id', p.id)
      const votedIds = new Set((votedRows ?? []).map((v) => v.market_id))

      const { data: digestRows } = await admin
        .from('email_digest_log')
        .select('market_id')
        .eq('user_id', p.id)
        .gte('sent_at', since14d)

      const emailedSet = new Set((digestRows ?? []).map((r) => (r as { market_id: string }).market_id))

      const { data: pool } = await admin
        .from('prediction_markets')
        .select('id, title, current_probability, market_type, total_votes')
        .in('status', ['active', 'trading'])
        .gt('total_votes', 0)
        .order('total_votes', { ascending: false, nullsFirst: false })
        .limit(80)

      const picks = (pool ?? []).filter((m) => !votedIds.has(m.id) && !emailedSet.has(m.id)).slice(0, 3)
      if (picks.length === 0) {
        skipped++
        continue
      }

      const markets: ReengagementMarket[] = []
      for (const m of picks) {
        const yesPct = await getMarketYesPercentForCard(admin, m.id, {
          current_probability: m.current_probability,
          market_type: (m as { market_type?: string }).market_type,
        })
        markets.push({
          title: m.title,
          yesPercent: yesPct,
          url: `${APP_URL}/predictions/markets/${m.id}`,
        })
      }

      const unsub = `${APP_URL}/api/email/unsubscribe?user=${encodeURIComponent(p.id)}&token=${encodeURIComponent(createUnsubscribeToken(p.id))}`
      const tpl = reengagementInactiveTemplate({ markets, unsubscribeUrl: unsub })

      const r = await sendEmail(email, tpl)
      if (r.success) {
        sent++
        for (const m of picks) {
          try {
            await admin.from('email_digest_log').insert({
              user_id: p.id,
              market_id: m.id,
              email_type: 'reengagement',
            })
          } catch (e) {
            console.error('[reengagement] email_digest_log', e)
          }
        }
        try {
          const summary = markets.map((m) => m.title).join(' · ')
          await admin.from('notifications').insert({
            user_id: p.id,
            type: 'reengagement_weekly',
            title: 'La comunidad sigue prediciendo',
            message: summary.slice(0, 500),
            body: summary.slice(0, 500),
            link: `/predictions/markets/${picks[0].id}`,
          })
        } catch (e) {
          console.error('[reengagement] notification', e)
        }
      } else {
        failed++
        console.warn('[reengagement] send', email, r.error)
      }
    }

    await cronHealthComplete(runId, 'reengagement-inactive', admin, {
      success: true,
      summary: `sent ${sent}, failed ${failed}, skipped ${skipped}, candidates ${candidates.length}`,
    })

    return NextResponse.json({ ok: true, sent, failed, skipped, candidates: candidates.length })
  } catch (error) {
    await cronHealthComplete(runId, 'reengagement-inactive', admin, {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
