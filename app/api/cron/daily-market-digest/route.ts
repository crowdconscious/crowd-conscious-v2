import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/resend'
import { dailyMarketDigestTemplate } from '@/lib/prediction-emails'
import { createUnsubscribeToken } from '@/lib/email-unsubscribe'
import { getCommunityProbabilitySummary } from '@/lib/market-email-helpers'
import { prefetchDailyDigestData, selectMarketForDailyDigest } from '@/lib/daily-digest-market-selector'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

/**
 * Vercel cron: staggered UTC (see vercel.json).
 * One personalized market per opted-in user (deduped 14d, prioritizes unvoted + new + trending).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck('daily-market-digest', admin)

  try {
    const prefetch = await prefetchDailyDigestData(admin)
    if (!prefetch.markets.length) {
      await cronHealthComplete(runId, 'daily-market-digest', admin, {
        success: true,
        summary: 'skipped: no_eligible_markets',
      })
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_eligible_markets' })
    }

    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, email, email_notifications')
      .not('email', 'is', null)

    if (profErr) {
      console.error('[daily-market-digest] profiles', profErr)
      await cronHealthComplete(runId, 'daily-market-digest', admin, {
        success: false,
        error: profErr.message,
      })
      return NextResponse.json({ error: 'profiles_fetch' }, { status: 500 })
    }

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const p of profiles ?? []) {
      if (p.email_notifications === false) continue
      const email = (p.email as string)?.trim()
      if (!email) continue

      const selection = await selectMarketForDailyDigest(admin, p.id, prefetch)
      if (!selection) {
        skipped++
        console.log(`[daily-market-digest] Skipping ${email} — no new market available`)
        continue
      }

      const top = selection.market
      const probabilitySummary = await getCommunityProbabilitySummary(admin, top.id, {
        current_probability: top.current_probability,
        market_type: (top as { market_type?: string }).market_type,
      })

      const marketUrl = `${APP_URL}/predictions/markets/${top.id}`

      const unsub = `${APP_URL}/api/email/unsubscribe?user=${encodeURIComponent(p.id)}&token=${encodeURIComponent(createUnsubscribeToken(p.id))}`
      const tpl = dailyMarketDigestTemplate({
        marketTitle: top.title,
        probabilitySummary,
        marketUrl,
        unsubscribeUrl: unsub,
        digestVariant: selection.variant,
      })

      const r = await sendEmail(email, tpl)
      if (r.success) {
        sent++
        try {
          await admin.from('email_digest_log').insert({
            user_id: p.id,
            market_id: top.id,
            email_type: 'daily_digest',
          })
        } catch (e) {
          console.error('[daily-market-digest] email_digest_log insert', e)
        }
        try {
          await admin.from('notifications').insert({
            user_id: p.id,
            type: 'daily_market_digest',
            title: tpl.subject.slice(0, 120),
            message: `Mercado: ${top.title.slice(0, 120)}`,
            body: `Mercado: ${top.title.slice(0, 120)} · ${probabilitySummary}`,
            link: `/predictions/markets/${top.id}`,
          })
        } catch (e) {
          console.error('[daily-market-digest] notification', e)
        }
      } else {
        failed++
        console.warn('[daily-market-digest] send', email, r.error)
      }
    }

    await cronHealthComplete(runId, 'daily-market-digest', admin, {
      success: true,
      summary: `sent ${sent}, failed ${failed}, skipped ${skipped}, pool ${prefetch.markets.length}`,
    })

    return NextResponse.json({ ok: true, sent, failed, skipped, poolSize: prefetch.markets.length })
  } catch (error) {
    await cronHealthComplete(runId, 'daily-market-digest', admin, {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
