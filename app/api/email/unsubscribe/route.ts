import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyUnsubscribeToken } from '@/lib/email-unsubscribe'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

type Outcome = 'ok' | 'invalid' | 'error'

/** Sets profiles.email_notifications = false (marketing/newsletter opt-out). */
async function unsubscribeUser(request: NextRequest): Promise<Outcome> {
  const userId = request.nextUrl.searchParams.get('user')
  const token = request.nextUrl.searchParams.get('token')
  if (!userId || !token || !verifyUnsubscribeToken(userId, token)) return 'invalid'
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('profiles').update({ email_notifications: false }).eq('id', userId)
    if (error) {
      console.error('[unsubscribe]', error)
      return 'error'
    }
    return 'ok'
  } catch (e) {
    console.error('[unsubscribe]', e)
    return 'error'
  }
}

/** Link clicked in the email footer. */
export async function GET(request: NextRequest) {
  const outcome = await unsubscribeUser(request)
  if (outcome === 'invalid') {
    return new NextResponse('Enlace inválido o expirado.', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
  if (outcome === 'error') {
    return new NextResponse('No se pudo actualizar la preferencia.', { status: 500 })
  }
  return NextResponse.redirect(`${APP_URL}/settings?email_notifications=off`, 302)
}

/**
 * RFC 8058 one-click unsubscribe (Gmail/Yahoo "Unsubscribe" button). The
 * mailbox provider POSTs `List-Unsubscribe=One-Click` to the URL from the
 * List-Unsubscribe header; no cookies, no redirects, just a 2xx.
 */
export async function POST(request: NextRequest) {
  const outcome = await unsubscribeUser(request)
  const status = outcome === 'ok' ? 200 : outcome === 'invalid' ? 400 : 500
  return new NextResponse(outcome === 'ok' ? 'Unsubscribed' : 'Unsubscribe failed', {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
