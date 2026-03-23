import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/resend'
import { dailyMarketDigestTemplate } from '@/lib/prediction-emails'
import { createUnsubscribeToken } from '@/lib/email-unsubscribe'
import { getCommunityProbabilitySummary } from '@/lib/market-email-helpers'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

/**
 * Vercel cron: 9:00 AM America/Mexico_City → 15:00 UTC (CST, UTC-6).
 * Sends one trending market to all opted-in users with an email on file.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: top, error: marketError } = await admin
    .from('prediction_markets')
    .select('id, title, current_probability, market_type, total_votes')
    .in('status', ['active', 'trading'])
    .order('total_votes', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (marketError || !top?.id) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no_active_market' })
  }

  const probabilitySummary = await getCommunityProbabilitySummary(admin, top.id, {
    current_probability: top.current_probability,
    market_type: (top as { market_type?: string }).market_type,
  })

  const marketUrl = `${APP_URL}/predictions/markets/${top.id}`

  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    .select('id, email, email_notifications')
    .not('email', 'is', null)

  if (profErr) {
    console.error('[daily-market-digest] profiles', profErr)
    return NextResponse.json({ error: 'profiles_fetch' }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const p of profiles ?? []) {
    if (p.email_notifications === false) continue
    const email = (p.email as string)?.trim()
    if (!email) continue

    const unsub = `${APP_URL}/api/email/unsubscribe?user=${encodeURIComponent(p.id)}&token=${encodeURIComponent(createUnsubscribeToken(p.id))}`
    const tpl = dailyMarketDigestTemplate({
      marketTitle: top.title,
      probabilitySummary,
      marketUrl,
      unsubscribeUrl: unsub,
    })

    const r = await sendEmail(email, tpl)
    if (r.success) {
      sent++
      try {
        await admin.from('notifications').insert({
          user_id: p.id,
          type: 'daily_market_digest',
          title: '¿Votaste hoy?',
          message: `Mercado destacado: ${top.title.slice(0, 120)}`,
          body: `Mercado destacado: ${top.title.slice(0, 120)} · ${probabilitySummary}`,
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

  return NextResponse.json({ ok: true, sent, failed, marketId: top.id })
}
