import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/resend'
import { blogDigestNewsletterTemplate } from '@/lib/prediction-emails'
import { createUnsubscribeToken } from '@/lib/email-unsubscribe'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

/**
 * Blog digest (replaces per-user random market email).
 * Runs Tue/Thu/Sat UTC (see vercel.json). Sends only if:
 * - A published blog post exists with published_at newer than the last blog_digest send, and
 * - At least 48h since the last blog_digest email (global), or no prior send.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck('daily-market-digest', admin)

  try {
    const { data: latestPost } = await admin
      .from('blog_posts')
      .select('id, slug, title, excerpt, category, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (!latestPost?.published_at) {
      await cronHealthComplete(runId, 'daily-market-digest', admin, {
        success: true,
        summary: 'skipped: no_published_blog',
      })
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_published_blog' })
    }

    const { data: lastDigestRows } = await admin
      .from('email_digest_log')
      .select('sent_at, blog_post_id')
      .eq('email_type', 'blog_digest')
      .order('sent_at', { ascending: false })
      .limit(1)

    const lastDigest = lastDigestRows?.[0] as { sent_at: string; blog_post_id: string | null } | undefined

    const publishedAt = new Date(latestPost.published_at).getTime()
    const lastSendAt = lastDigest ? new Date(lastDigest.sent_at).getTime() : 0
    const hoursSinceLast = lastDigest
      ? (Date.now() - new Date(lastDigest.sent_at).getTime()) / 3600000
      : 999

    const hasFreshPost = publishedAt > lastSendAt
    if (!hasFreshPost) {
      await cronHealthComplete(runId, 'daily-market-digest', admin, {
        success: true,
        summary: 'skipped: no_new_post_since_last_send',
      })
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_new_post_since_last_send' })
    }

    if (lastDigest && hoursSinceLast < 48) {
      await cronHealthComplete(runId, 'daily-market-digest', admin, {
        success: true,
        summary: 'skipped: cooldown_48h',
      })
      return NextResponse.json({ ok: true, skipped: true, reason: 'cooldown_48h' })
    }

    const { data: trending } = await admin
      .from('prediction_markets')
      .select('id, title, total_votes, category')
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(3)

    const marketIds = (trending ?? []).map((m) => m.id)
    const outcomesByMarket = new Map<string, { label: string; probability: number }[]>()
    if (marketIds.length > 0) {
      const { data: outcomeRows } = await admin
        .from('market_outcomes')
        .select('market_id, label, probability')
        .in('market_id', marketIds)
      for (const row of outcomeRows ?? []) {
        const mid = row.market_id as string
        const list = outcomesByMarket.get(mid) ?? []
        list.push({
          label: String(row.label ?? '').trim() || '—',
          probability: Number(row.probability) || 0,
        })
        outcomesByMarket.set(mid, list)
      }
      for (const [mid, list] of outcomesByMarket) {
        list.sort((a, b) => b.probability - a.probability)
        outcomesByMarket.set(mid, list.slice(0, 4))
      }
    }

    function normalizeOutcomeLabel(s: string): string {
      return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    }

    function formatResultsLine(mid: string): { line: string | null; style: 'binary' | 'multi' } {
      const list = outcomesByMarket.get(mid)
      if (!list?.length) return { line: null, style: 'multi' }
      const sorted = [...list].sort((a, b) => b.probability - a.probability)
      if (sorted.length === 2) {
        const top = sorted[0]
        const nl = normalizeOutcomeLabel(top.label)
        if (nl === 'si' || nl === 'yes') {
          return { line: `${Math.round(top.probability)}% dice Sí`, style: 'binary' }
        }
        if (nl === 'no') {
          return { line: `${Math.round(top.probability)}% dice No`, style: 'binary' }
        }
        return {
          line: `${sorted[0].label} ${Math.round(sorted[0].probability)}% · ${sorted[1].label} ${Math.round(sorted[1].probability)}%`,
          style: 'binary',
        }
      }
      return {
        line: sorted.map((o) => `${o.label} ${Math.round(o.probability)}%`).join(' · '),
        style: 'multi',
      }
    }

    let fundTotalMxn = 0
    try {
      const { data: fund } = await admin.from('conscious_fund').select('current_balance').limit(1).maybeSingle()
      fundTotalMxn = Number(fund?.current_balance ?? 0)
    } catch {
      fundTotalMxn = 0
    }

    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, email, email_notifications')
      .not('email', 'is', null)

    if (profErr) {
      console.error('[blog-digest] profiles', profErr)
      await cronHealthComplete(runId, 'daily-market-digest', admin, {
        success: false,
        error: profErr.message,
      })
      return NextResponse.json({ error: 'profiles_fetch' }, { status: 500 })
    }

    let sent = 0
    let failed = 0

    for (const p of profiles ?? []) {
      if (p.email_notifications === false) continue
      const email = (p.email as string)?.trim()
      if (!email) continue

      const unsub = `${APP_URL}/api/email/unsubscribe?user=${encodeURIComponent(p.id)}&token=${encodeURIComponent(createUnsubscribeToken(p.id))}`
      const personal = blogDigestNewsletterTemplate({
        post: {
          slug: latestPost.slug,
          title: latestPost.title,
          excerpt: latestPost.excerpt ?? '',
          category: latestPost.category ?? 'insight',
        },
        markets: (trending ?? []).map((m) => {
          const { line, style } = formatResultsLine(m.id)
          return {
            ...m,
            resultsLine: line,
            marketStyle: style,
          }
        }),
        fundTotalMxn,
        unsubscribeUrl: unsub,
      })

      const r = await sendEmail(email, personal)
      if (r.success) {
        sent++
        try {
          await admin.from('email_digest_log').insert({
            user_id: p.id,
            market_id: trending?.[0]?.id ?? null,
            blog_post_id: latestPost.id,
            email_type: 'blog_digest',
          })
        } catch (e) {
          console.error('[blog-digest] email_digest_log insert', e)
        }
      } else {
        failed++
        console.warn('[blog-digest] send', email, r.error)
      }
    }

    await cronHealthComplete(runId, 'daily-market-digest', admin, {
      success: true,
      summary: `blog_digest sent ${sent}, failed ${failed}, post ${latestPost.slug}`,
    })

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      slug: latestPost.slug,
    })
  } catch (error) {
    await cronHealthComplete(runId, 'daily-market-digest', admin, {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
