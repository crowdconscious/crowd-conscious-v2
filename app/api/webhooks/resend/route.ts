import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { suppressEmail } from '@/lib/email-suppression'
import { suppressionFromEvent, verifyResendWebhook } from '@/lib/resend-webhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Resend webhook: email.bounced (permanent) and email.complained add the
 * recipient to public.email_suppressions so bulk sends skip them.
 * Requires RESEND_WEBHOOK_SECRET (signing secret of the Resend webhook).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 })
  }
  const raw = await request.text()
  const ok = verifyResendWebhook(
    raw,
    {
      id: request.headers.get('svix-id'),
      timestamp: request.headers.get('svix-timestamp'),
      signature: request.headers.get('svix-signature'),
    },
    secret
  )
  if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 401 })

  let evt: Parameters<typeof suppressionFromEvent>[0]
  try {
    evt = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const s = suppressionFromEvent(evt)
  if (!s) return NextResponse.json({ ok: true, ignored: evt.type ?? null })

  try {
    const admin = createAdminClient()
    for (const email of s.emails) {
      await suppressEmail(admin, email, s.reason, {
        eventId: request.headers.get('svix-id') ?? undefined,
        info: s.info,
      })
    }
  } catch (e) {
    console.error('[webhooks/resend]', e)
    return NextResponse.json({ error: 'suppression failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, suppressed: s.emails.length, reason: s.reason })
}
