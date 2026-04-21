import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  isSponsorEmailType,
  verifySponsorUnsubscribeToken,
  type SponsorEmailType,
} from '@/lib/email-unsubscribe'

/**
 * One-click unsubscribe for sponsor email channels.
 *
 * Accessed via a GET link in every sponsor transactional email:
 *   /api/email/unsubscribe/sponsor?account=<uuid>&type=<channel>&token=<hmac>
 *
 * The token binds `(account, type)` so a link from the pulse_launch email
 * can't silence pulse_closure and vice versa. Once verified, we flip the
 * corresponding key in `sponsor_accounts.email_preferences` (JSONB) to
 * `false` using a Postgres jsonb_set with the jsonb boolean literal.
 *
 * On success we redirect the sponsor to /unsubscribed with a query
 * parameter describing what they opted out of — re-uses the existing
 * static confirmation page.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get('account')
  const type = request.nextUrl.searchParams.get('type')
  const token = request.nextUrl.searchParams.get('token')

  if (!account || !type || !token || !isSponsorEmailType(type)) {
    return new NextResponse('Enlace inválido.', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  if (!verifySponsorUnsubscribeToken(account, type as SponsorEmailType, token)) {
    return new NextResponse('Enlace inválido o expirado.', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  try {
    const admin = createAdminClient()
    // Read/modify/write on the JSONB column. Acceptable concurrency: a
    // single human clicking their own unsubscribe link — lost-update
    // races would require two concurrent flips for the same account,
    // which we don't expect. If it becomes an issue, swap to a
    // jsonb_set RPC; the HMAC link remains valid either way.
    const { data: row, error: readErr } = await admin
      .from('sponsor_accounts')
      .select('email_preferences')
      .eq('id', account)
      .maybeSingle()

    if (readErr || !row) {
      console.error('[unsubscribe/sponsor] read failed:', readErr)
      return new NextResponse('Cuenta no encontrada.', {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }

    const current = (row.email_preferences as Record<string, unknown>) ?? {}
    const next = { ...current, [type]: false }
    const { error: upErr } = await admin
      .from('sponsor_accounts')
      .update({ email_preferences: next })
      .eq('id', account)

    if (upErr) {
      console.error('[unsubscribe/sponsor] update failed:', upErr)
      return new NextResponse(
        'No pudimos completar la baja. Contáctanos en comunidad@crowdconscious.app.',
        { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } }
      )
    }
  } catch (err) {
    console.error('[unsubscribe/sponsor] threw:', err)
    return new NextResponse('Error al procesar la baja.', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const redirectUrl = `${APP_URL}/unsubscribed?sponsor=1&channel=${encodeURIComponent(type)}`
  return NextResponse.redirect(redirectUrl, 302)
}
