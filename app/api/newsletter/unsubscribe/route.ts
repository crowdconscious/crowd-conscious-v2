import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyNewsletterListUnsubscribeToken } from '@/lib/email-unsubscribe'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  const token = request.nextUrl.searchParams.get('token')
  if (!email || !token || !verifyNewsletterListUnsubscribeToken(email, token)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    const admin = createAdminClient()
    await admin
      .from('newsletter_subscribers')
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', email.trim().toLowerCase())

    const norm = email.trim().toLowerCase()
    const { data: prof } = await admin.from('profiles').select('id').ilike('email', norm).maybeSingle()
    if (prof?.id) {
      await admin.from('profiles').update({ email_notifications: false }).eq('id', prof.id)
    }
  } catch (e) {
    console.error('[newsletter/unsubscribe]', e)
  }

  return NextResponse.redirect(`${APP_URL}/unsubscribed`, 302)
}
