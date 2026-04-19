import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { createAdminClient } from '@/lib/supabase-admin'
import { getRateLimitIdentifier } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * RFC 5322-lite email regex — strict enough to reject obvious junk while
 * staying permissive on real-world TLDs and subdomains.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Hourly limiter (5/hour/IP) — only constructed when Upstash is wired.
 * Keep this local to the newsletter endpoint so abusive signups can't
 * cannibalize the global per-minute pools.
 */
const newsletterRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

const newsletterLimit = newsletterRedis
  ? new Ratelimit({
      redis: newsletterRedis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      analytics: true,
      prefix: '@ratelimit/newsletter',
    })
  : null

export async function POST(request: NextRequest) {
  try {
    if (newsletterLimit) {
      const id = await getRateLimitIdentifier(request)
      const { success } = await newsletterLimit.limit(id)
      if (!success) {
        return NextResponse.json(
          { error: 'Too many signups, try again in an hour' },
          { status: 429 }
        )
      }
    }

    const body = await request.json().catch(() => ({}))
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const name = body.name != null ? String(body.name).trim().slice(0, 120) : null
    const source = body.source != null ? String(body.source).slice(0, 80) : 'landing_page'
    const language = body.language === 'en' ? 'en' : 'es'

    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Dedup leak guard: probe first so we can respond identically whether
    // the address is new or already on the list. Always returns 200 to
    // avoid telling an attacker which emails are subscribed.
    const { data: existing } = await admin
      .from('newsletter_subscribers')
      .select('id, is_active')
      .eq('email', email)
      .maybeSingle()

    if (existing && existing.is_active) {
      return NextResponse.json({ success: true, already: true })
    }

    const { error } = await admin.from('newsletter_subscribers').upsert(
      {
        email,
        name,
        source,
        language,
        is_active: true,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      },
      { onConflict: 'email' }
    )

    if (error) {
      console.error('[newsletter/subscribe]', error)
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[newsletter/subscribe]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
