import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { runCrowdNewsletterCron } from '@/lib/crowd-newsletter-cron'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Crowd newsletter: blog + Pulse + trending markets.
 * Schedule: Mon/Wed/Fri 14:00 UTC (vercel.json). Sends only if 48h+ since last newsletter/blog_digest.
 * Auth: Authorization: Bearer CRON_SECRET (set in Vercel env).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const result = await runCrowdNewsletterCron(admin, 'newsletter')

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'Cron failed', debug: result.debug },
      { status: 500 }
    )
  }

  if (result.skipped) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: result.reason,
      debug: result.debug,
    })
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    failed: result.failed,
    subject: result.subject,
    debug: result.debug,
  })
}
