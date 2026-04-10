import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { runCrowdNewsletterCron } from '@/lib/crowd-newsletter-cron'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Admin-only: same behavior as GET /api/cron/newsletter (optional body.force to skip 48h cooldown).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const force = Boolean((body as { force?: boolean }).force)

    const admin = createAdminClient()
    const result = await runCrowdNewsletterCron(admin, 'newsletter', { force })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? 'Newsletter run failed', debug: result.debug },
        { status: 500 }
      )
    }

    if (result.skipped) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
        force,
        debug: result.debug,
      })
    }

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      subject: result.subject,
      force,
      debug: result.debug,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[send-newsletter]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
