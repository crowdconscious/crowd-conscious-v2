import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Read and update a sponsor's email notification preferences from the
 * in-dashboard settings panel. Authed by the sponsor's `access_token`
 * URL segment — same pattern as every other /api/dashboard/sponsor/* route.
 *
 * Body shape on POST:
 *   {
 *     pulse_launch?: boolean,
 *     pulse_closure?: boolean,
 *     locale?: 'es' | 'en'
 *   }
 *
 * `locale` is accepted alongside the toggles so we can keep the email
 * language in sync with whatever the sponsor has been using in the
 * dashboard (saved when they hit "Guardar"). Unknown locale values are
 * ignored — the DB CHECK constraint would reject them anyway.
 */

export const dynamic = 'force-dynamic'

type PrefsBody = {
  pulse_launch?: boolean
  pulse_closure?: boolean
  locale?: 'es' | 'en'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sponsor_accounts')
    .select('id, email_preferences, locale, contact_email')
    .eq('access_token', token)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }

  const prefs = (data.email_preferences as Record<string, unknown>) ?? {}
  return NextResponse.json({
    preferences: {
      pulse_launch: prefs.pulse_launch === false ? false : true,
      pulse_closure: prefs.pulse_closure === false ? false : true,
    },
    locale: (data.locale as string | null) === 'en' ? 'en' : 'es',
    contact_email: data.contact_email,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const admin = createAdminClient()

    const { data: account, error: accErr } = await admin
      .from('sponsor_accounts')
      .select('id, email_preferences, locale')
      .eq('access_token', token)
      .maybeSingle()

    if (accErr || !account) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    let body: PrefsBody = {}
    try {
      body = (await request.json()) as PrefsBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const current = (account.email_preferences as Record<string, unknown>) ?? {}
    const nextPrefs: Record<string, unknown> = { ...current }
    if (typeof body.pulse_launch === 'boolean') nextPrefs.pulse_launch = body.pulse_launch
    if (typeof body.pulse_closure === 'boolean') nextPrefs.pulse_closure = body.pulse_closure

    const update: { email_preferences: Record<string, unknown>; locale?: string } = {
      email_preferences: nextPrefs,
    }
    if (body.locale === 'es' || body.locale === 'en') {
      update.locale = body.locale
    }

    const { error: upErr } = await admin
      .from('sponsor_accounts')
      .update(update)
      .eq('id', account.id)

    if (upErr) {
      console.error('[email-preferences] update failed:', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      preferences: {
        pulse_launch: nextPrefs.pulse_launch === false ? false : true,
        pulse_closure: nextPrefs.pulse_closure === false ? false : true,
      },
      locale: update.locale ?? (account.locale as string | null) ?? 'es',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[email-preferences]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
