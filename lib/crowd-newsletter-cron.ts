/**
 * Crowd newsletter: blog + Pulse + trending markets, Mon/Wed/Fri cron + 36h cooldown
 * (bypassed when a new published blog post has not yet been featured in a batch send).
 *
 * Why 36h and not 48h: the Vercel cron fires at 14:00 UTC Mon/Wed/Fri, but
 * each run takes a few seconds so the `email_digest_log.sent_at` timestamp
 * drifts forward (e.g. Monday 14:00:05). If the cooldown equaled the
 * gap (48h), Wednesday's 14:00:00 trigger would compute
 * `hoursSinceLast = 47.9999 < 48` and silently SKIP. 36h leaves comfortable
 * slack for the M/W/F cadence while still blocking accidental rapid
 * re-fires (e.g. someone hitting the admin "Send now" button twice).
 * Force-send (`?force=1` / admin "ignore cooldown") bypasses entirely.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmailsWithConcurrency } from '@/lib/resend'
import {
  crowdNewsletterEmailTemplate,
  type BlogDigestMarket,
  type BlogPostDigest,
  type NewsletterConsciousLocation,
} from '@/lib/prediction-emails'
import {
  createNewsletterListUnsubscribeToken,
  createUnsubscribeToken,
} from '@/lib/email-unsubscribe'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'
import { consciousFundBalanceMxn } from '@/lib/conscious-fund-balance'
import { generateNewsletterIntroAndSubject } from '@/lib/agents/newsletter-polish'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

const DIGEST_TYPES = ['newsletter', 'blog_digest'] as const

function wcDaysUntil(): number {
  return Math.ceil((new Date('2026-06-11T12:00:00Z').getTime() - Date.now()) / 86400000)
}

export async function runCrowdNewsletterCron(
  admin: SupabaseClient,
  healthJobName: 'newsletter' | 'daily-market-digest' = 'newsletter',
  options?: { force?: boolean }
): Promise<{
  ok: boolean
  skipped?: boolean
  reason?: string
  sent?: number
  failed?: number
  subject?: string
  error?: string
  /** For debugging Vercel cron (cooldown, last send, schedule is Mon/Wed/Fri 14:00 UTC) */
  debug?: {
    lastSentAt: string | null
    hoursSinceLast: number | null
    recipientCount: number
    scheduleNote: string
  }
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

    const lastSentAt = lastRow?.sent_at ? String(lastRow.sent_at) : null
    const hoursSinceLast = lastSentAt
      ? (Date.now() - new Date(lastSentAt).getTime()) / 3600000
      : null

    const lastFeaturedBlogId = (lastRow?.blog_post_id as string | null) ?? null

    const { data: latestPost } = await admin
      .from('blog_posts')
      .select('id, slug, title, excerpt, category, published_at, content, cover_image_url')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    /** New post since last newsletter batch — do not block on 48h cooldown so M/W/F can feature fresh posts. */
    const hasNewBlogSinceLastSend =
      !!latestPost?.id &&
      (!lastFeaturedBlogId || latestPost.id !== lastFeaturedBlogId)

    const cooldownHours = 36
    const force = options?.force === true
    if (
      !force &&
      !hasNewBlogSinceLastSend &&
      hoursSinceLast != null &&
      hoursSinceLast < cooldownHours
    ) {
      await cronHealthComplete(runId, healthJobName, admin, {
        success: true,
        summary: `skipped: cooldown ${Math.round(hoursSinceLast)}h (need ${cooldownHours}h; last ${lastSentAt})`,
      })
      return {
        ok: true,
        skipped: true,
        reason: `cooldown_${Math.round(hoursSinceLast)}h`,
        debug: {
          lastSentAt,
          hoursSinceLast,
          recipientCount: 0,
          scheduleNote:
            'Mon/Wed/Fri 14:00 UTC — skipped until 36h after last send, unless a new blog is published or ?force=1',
        },
      }
    }

    const post: BlogPostDigest | null = latestPost
      ? {
          slug: latestPost.slug,
          title: latestPost.title,
          excerpt: latestPost.excerpt ?? '',
          category: latestPost.category ?? 'insight',
          content: (latestPost as { content?: string | null }).content ?? null,
          cover_image_url: (latestPost as { cover_image_url?: string | null }).cover_image_url ?? null,
          published_at: latestPost.published_at ?? null,
        }
      : null

    const highlightNewBlog = hasNewBlogSinceLastSend

    const { data: trending } = await admin
      .from('prediction_markets')
      .select('id, title, total_votes, category, is_pulse')
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .eq('is_draft', false)
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
      fundTotalMxn = consciousFundBalanceMxn(fund ?? undefined)
    } catch {
      fundTotalMxn = 0
    }

    let activeLocations: NewsletterConsciousLocation[] = []
    try {
      const { data: locRows } = await admin
        .from('conscious_locations')
        .select('id, name, slug, neighborhood, why_conscious')
        .eq('status', 'active')
        .order('is_featured', { ascending: false })
        .order('total_votes', { ascending: false })
        .limit(3)
      activeLocations = (locRows ?? []).map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ''),
        slug: String(r.slug ?? ''),
        neighborhood: (r.neighborhood as string | null) ?? null,
        why_conscious: (r.why_conscious as string | null) ?? null,
      }))
    } catch {
      activeLocations = []
    }

    if (!post && !pulseDigest && marketDigests.length === 0 && activeLocations.length === 0) {
      await cronHealthComplete(runId, healthJobName, admin, {
        success: true,
        summary: 'skipped: no_content (no published blog + no active markets + no conscious locations)',
      })
      return {
        ok: true,
        skipped: true,
        reason: 'no_published_blog_or_markets',
        debug: {
          lastSentAt,
          hoursSinceLast,
          recipientCount: 0,
          scheduleNote: 'Mon/Wed/Fri 14:00 UTC',
        },
      }
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

    let newsletterOnly: { email: string; language: string | null }[] = []
    try {
      const { data: subs } = await admin
        .from('newsletter_subscribers')
        .select('email, language')
        .eq('is_active', true)
      newsletterOnly = subs ?? []
    } catch {
      newsletterOnly = []
    }

    type Recipient = { email: string; unsubUrl: string }
    const byEmail = new Map<string, Recipient>()

    for (const p of profiles ?? []) {
      if (p.email_notifications === false) continue
      const email = (p.email as string)?.trim().toLowerCase()
      if (!email) continue
      const unsub = `${APP_URL}/api/email/unsubscribe?user=${encodeURIComponent(p.id)}&token=${encodeURIComponent(createUnsubscribeToken(p.id))}`
      byEmail.set(email, { email: p.email as string, unsubUrl: unsub })
    }

    for (const row of newsletterOnly) {
      const raw = String(row.email ?? '').trim().toLowerCase()
      if (!raw || !raw.includes('@')) continue
      if (byEmail.has(raw)) continue
      const tok = createNewsletterListUnsubscribeToken(raw)
      const unsub = `${APP_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(raw)}&token=${encodeURIComponent(tok)}`
      byEmail.set(raw, { email: String(row.email ?? '').trim(), unsubUrl: unsub })
    }

    const recipients = Array.from(byEmail.values())
    if (recipients.length === 0) {
      await cronHealthComplete(runId, healthJobName, admin, {
        success: true,
        summary: 'skipped: no_subscribers (profiles with email_notifications + newsletter_subscribers)',
      })
      return {
        ok: true,
        skipped: true,
        reason: 'no_subscribers',
        debug: {
          lastSentAt,
          hoursSinceLast,
          recipientCount: 0,
          scheduleNote: 'Mon/Wed/Fri 14:00 UTC',
        },
      }
    }

    // Optional Haiku polish: 1 intro paragraph + 3 subject candidates rotated
    // by week. Falls back silently to the deterministic subject + no intro if
    // ANTHROPIC_API_KEY is missing or the call fails. Keeps the newsletter
    // deterministic-first; LLM is additive.
    let subjectOverride: string | null = null
    let intro: string | null = null
    try {
      const polish = await generateNewsletterIntroAndSubject({
        postTitle: post?.title ?? null,
        postExcerpt: post?.excerpt ?? null,
        pulseTitle: pulseDigest?.title ?? null,
        marketTitles: marketDigests.map((m) => m.title),
        daysUntilWorldCup: wcDaysUntil(),
      })
      if (polish) {
        intro = polish.intro
        // Rotate subject by ISO week so M/W/F editions don't repeat the same
        // hook. Falls back to first candidate if list is too short.
        const weekIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7))
        const candidates = polish.subject_candidates ?? []
        if (candidates.length > 0) {
          subjectOverride = candidates[weekIdx % candidates.length]
        }
      }
    } catch (e) {
      console.warn('[newsletter] polish call failed; using deterministic subject:', e)
    }

    let subjectUsed = 'Lo que CDMX piensa esta semana | Crowd Conscious'
    const messages = recipients.map((rec) => {
      const tpl = crowdNewsletterEmailTemplate({
        post,
        highlightNewBlog,
        pulseMarket: pulseDigest,
        markets: marketDigests,
        fundTotalMxn,
        unsubscribeUrl: rec.unsubUrl,
        daysUntilWorldCup: wcDaysUntil(),
        activeLocations,
        intro,
        subjectOverride,
      })
      subjectUsed = tpl.subject
      return { to: rec.email, subject: tpl.subject, html: tpl.html }
    })

    const { sent, failed } = await sendEmailsWithConcurrency(messages, 8)

    if (failed > 0) {
      console.warn('[newsletter] send failures', failed, 'of', recipients.length)
    }

    const allFailed = sent === 0 && recipients.length > 0

    if (sent > 0) {
      try {
        await admin.from('email_digest_log').insert({
          user_id: null,
          market_id: nonPulse[0]?.id ?? pulseMarket?.id ?? null,
          blog_post_id: latestPost?.id ?? null,
          email_type: 'newsletter',
        })
      } catch (e) {
        console.error('[newsletter] email_digest_log batch insert', e)
      }
    }

    await cronHealthComplete(runId, healthJobName, admin, {
      success: !allFailed,
      error: allFailed ? 'All newsletter sends failed (Resend / API key / domain)' : undefined,
      summary: allFailed
        ? `FAILED: 0 sent, ${failed} failed, ${recipients.length} recipients — check RESEND_API_KEY and Resend dashboard`
        : `newsletter sent ${sent}, failed ${failed}, recipients ${recipients.length}, post ${latestPost?.slug ?? 'none'}`,
    })

    return {
      ok: !allFailed,
      error: allFailed ? 'all_sends_failed' : undefined,
      sent,
      failed,
      subject: subjectUsed,
      debug: {
        lastSentAt,
        hoursSinceLast,
        recipientCount: recipients.length,
        scheduleNote: 'Mon/Wed/Fri 14:00 UTC',
      },
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
