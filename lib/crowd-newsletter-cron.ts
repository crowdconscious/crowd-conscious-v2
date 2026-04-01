/**
 * Crowd newsletter: blog + Pulse + trending markets, max ~3×/week via cron + 48h cooldown.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'
import { crowdNewsletterEmailTemplate, type BlogDigestMarket, type BlogPostDigest } from '@/lib/prediction-emails'
import { createUnsubscribeToken } from '@/lib/email-unsubscribe'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

const DIGEST_TYPES = ['newsletter', 'blog_digest'] as const

function wcDaysUntil(): number {
  return Math.ceil((new Date('2026-06-11T12:00:00Z').getTime() - Date.now()) / 86400000)
}

export async function runCrowdNewsletterCron(
  admin: SupabaseClient,
  healthJobName: 'newsletter' | 'daily-market-digest' = 'newsletter'
): Promise<{
  ok: boolean
  skipped?: boolean
  reason?: string
  sent?: number
  failed?: number
  subject?: string
  error?: string
}> {
  const { runId } = await cronHealthCheck(healthJobName, admin)

  try {
    const { data: lastRow } = await admin
      .from('email_digest_log')
      .select('sent_at, blog_post_id')
      .in('email_type', [...DIGEST_TYPES])
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const hoursSinceLast = lastRow?.sent_at
      ? (Date.now() - new Date(lastRow.sent_at as string).getTime()) / 3600000
      : 999

    if (hoursSinceLast < 48) {
      await cronHealthComplete(runId, healthJobName, admin, {
        success: true,
        summary: `skipped: cooldown ${Math.round(hoursSinceLast)}h`,
      })
      return {
        ok: true,
        skipped: true,
        reason: `cooldown_${Math.round(hoursSinceLast)}h`,
      }
    }

    const lastFeaturedBlogId = (lastRow?.blog_post_id as string | null) ?? null

    const { data: latestPost } = await admin
      .from('blog_posts')
      .select('id, slug, title, excerpt, category, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    const post: BlogPostDigest | null = latestPost
      ? {
          slug: latestPost.slug,
          title: latestPost.title,
          excerpt: latestPost.excerpt ?? '',
          category: latestPost.category ?? 'insight',
        }
      : null

    const highlightNewBlog =
      !!latestPost?.id && (!lastFeaturedBlogId || latestPost.id !== lastFeaturedBlogId)

    const { data: trending } = await admin
      .from('prediction_markets')
      .select('id, title, total_votes, category, is_pulse')
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(8)

    const list = trending ?? []
    const pulseMarket = list.find((m) => m.is_pulse === true) ?? null
    const nonPulse = list.filter((m) => !m.is_pulse).slice(0, 3)

    const marketIds = [...new Set([...nonPulse.map((m) => m.id), ...(pulseMarket ? [pulseMarket.id] : [])])]
    const outcomesByMarket = new Map<string, { label: string; probability: number }[]>()
    if (marketIds.length > 0) {
      const { data: outcomeRows } = await admin
        .from('market_outcomes')
        .select('market_id, label, probability')
        .in('market_id', marketIds)
      for (const row of outcomeRows ?? []) {
        const mid = row.market_id as string
        const listO = outcomesByMarket.get(mid) ?? []
        listO.push({
          label: String(row.label ?? '').trim() || '—',
          probability: Number(row.probability) || 0,
        })
        outcomesByMarket.set(mid, listO)
      }
      for (const [mid, listO] of outcomesByMarket) {
        listO.sort((a, b) => b.probability - a.probability)
        outcomesByMarket.set(mid, listO.slice(0, 4))
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
      const listO = outcomesByMarket.get(mid)
      if (!listO?.length) return { line: null, style: 'multi' }
      const sorted = [...listO].sort((a, b) => b.probability - a.probability)
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

    function toDigestMarket(m: (typeof list)[0]): BlogDigestMarket {
      const { line, style } = formatResultsLine(m.id)
      return {
        id: m.id,
        title: m.title,
        total_votes: m.total_votes,
        category: m.category,
        resultsLine: line,
        marketStyle: style,
      }
    }

    const pulseDigest = pulseMarket ? toDigestMarket(pulseMarket) : null
    const marketDigests: BlogDigestMarket[] = nonPulse.slice(0, 2).map(toDigestMarket)

    let fundTotalMxn = 0
    try {
      const { data: fund } = await admin.from('conscious_fund').select('current_balance').limit(1).maybeSingle()
      fundTotalMxn = Number(fund?.current_balance ?? 0)
    } catch {
      fundTotalMxn = 0
    }

    if (!post && !pulseDigest && marketDigests.length === 0) {
      await cronHealthComplete(runId, healthJobName, admin, {
        success: true,
        summary: 'skipped: no_content',
      })
      return { ok: true, skipped: true, reason: 'no_published_blog_or_markets' }
    }

    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, email, email_notifications')
      .not('email', 'is', null)

    if (profErr) {
      await cronHealthComplete(runId, healthJobName, admin, {
        success: false,
        error: profErr.message,
      })
      return { ok: false, error: profErr.message }
    }

    let sent = 0
    let failed = 0
    let subjectUsed = 'Lo que CDMX piensa esta semana | Crowd Conscious'

    for (const p of profiles ?? []) {
      if (p.email_notifications === false) continue
      const email = (p.email as string)?.trim()
      if (!email) continue

      const unsub = `${APP_URL}/api/email/unsubscribe?user=${encodeURIComponent(p.id)}&token=${encodeURIComponent(createUnsubscribeToken(p.id))}`
      const tpl = crowdNewsletterEmailTemplate({
        post,
        highlightNewBlog,
        pulseMarket: pulseDigest,
        markets: marketDigests,
        fundTotalMxn,
        unsubscribeUrl: unsub,
        daysUntilWorldCup: wcDaysUntil(),
      })
      subjectUsed = tpl.subject

      const r = await sendEmail(email, { subject: tpl.subject, html: tpl.html })
      if (r.success) {
        sent++
        try {
          await admin.from('email_digest_log').insert({
            user_id: p.id,
            market_id: nonPulse[0]?.id ?? pulseMarket?.id ?? null,
            blog_post_id: latestPost?.id ?? null,
            email_type: 'newsletter',
          })
        } catch (e) {
          console.error('[newsletter] email_digest_log insert', e)
        }
      } else {
        failed++
        console.warn('[newsletter] send', email, r.error)
      }
    }

    await cronHealthComplete(runId, healthJobName, admin, {
      success: true,
      summary: `newsletter sent ${sent}, failed ${failed}, post ${latestPost?.slug ?? 'none'}`,
    })

    return {
      ok: true,
      sent,
      failed,
      subject: subjectUsed,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await cronHealthComplete(runId, healthJobName, admin, {
      success: false,
      error: msg,
    })
    return { ok: false, error: msg }
  }
}
