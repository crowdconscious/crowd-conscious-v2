import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyNewsletterListUnsubscribeToken } from '@/lib/email-unsubscribe'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

/** Deactivates the newsletter_subscribers row (and the matching profile's marketing opt-in). */
async function unsubscribeNewsletter(request: NextRequest): Promise<'ok' | 'invalid' | 'error'> {
  const email = request.nextUrl.searchParams.get('email')
  const token = request.nextUrl.searchParams.get('token')
  if (!email || !token || !verifyNewsletterListUnsubscribeToken(email, token)) return 'invalid'

  try {
    const admin = createAdminClient()
    const norm = email.trim().toLowerCase()
    const { error } = await admin
      .from('newsletter_subscribers')
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', norm)
    if (error) {
      console.error('[newsletter/unsubscribe]', error)
      return 'error'
    }

    const { data: prof } = await admin.from('profiles').select('id').ilike('email', norm).maybeSingle()
    if (prof?.id) {
      await admin.from('profiles').update({ email_notifications: false }).eq('id', prof.id)
    }
    return 'ok'
  } catch (e) {
    console.error('[newsletter/unsubscribe]', e)
    return 'error'
  }
}

export async function GET(request: NextRequest) {
  const outcome = await unsubscribeNewsletter(request)
  if (outcome === 'invalid') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.redirect(`${APP_URL}/unsubscribed`, 302)
}

/** RFC 8058 one-click unsubscribe (POST from the mailbox provider). */
export async function POST(request: NextRequest) {
  const outcome = await unsubscribeNewsletter(request)
  const status = outcome === 'ok' ? 200 : outcome === 'invalid' ? 400 : 500
  return new NextResponse(outcome === 'ok' ? 'Unsubscribed' : 'Unsubscribe failed', {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
