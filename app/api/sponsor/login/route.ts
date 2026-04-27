import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { normalizeSponsorCouponCode } from '@/lib/sponsor-coupon-code'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sponsor/login   { coupon_code }
 *
 * Validates the per-sponsor coupon_code on `sponsor_accounts` and, on success:
 *   - sets an httpOnly cookie `sa_id` = sponsor_account_id (for Feature 3)
 *   - returns the dashboardUrl to redirect to
 *   - bumps last_login_at
 *
 * The actual dashboard at /dashboard/sponsor/[access_token] continues to use
 * the URL-token auth model. The cookie is additive and exists so future
 * server-side code (Feature 3 filtering, share links, etc.) can answer
 * "which sponsor is this?" without re-traversing the URL token.
 */
export async function POST(request: NextRequest) {
  let body: { coupon_code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const code = body.coupon_code ? normalizeSponsorCouponCode(body.coupon_code) : ''
  if (!code) {
    return NextResponse.json({ error: 'Coupon code requerido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Case-insensitive match on coupon_code; only active sponsors can log in.
  const { data: account, error } = await admin
    .from('sponsor_accounts')
    .select('id, status, access_token, company_name')
    .ilike('coupon_code', code)
    .maybeSingle()

  if (error) {
    console.error('[sponsor/login] lookup', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
  if (!account) {
    // Generic message — don't reveal whether the code exists but is paused.
    return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
  }
  if (account.status !== 'active') {
    return NextResponse.json(
      { error: 'Esta cuenta de sponsor está inactiva. Contacta a soporte.' },
      { status: 403 }
    )
  }

  // Best-effort last_login_at; failure here should not block login.
  admin
    .from('sponsor_accounts')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', account.id)
    .then(({ error: e }) => {
      if (e) console.error('[sponsor/login] last_login_at update', e)
    })

  const cookieStore = await cookies()
  cookieStore.set('sa_id', account.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // 30 days. The dashboard URL itself is the long-term auth; this cookie is
    // a convenience for server-side identity lookup.
    maxAge: 60 * 60 * 24 * 30,
  })

  const dashboardUrl = `/dashboard/sponsor/${account.access_token}`
  return NextResponse.json({
    success: true,
    sponsor_account_id: account.id,
    company_name: account.company_name,
    dashboardUrl,
  })
}
