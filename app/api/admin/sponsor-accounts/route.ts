import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-route-guard'
import {
  generateUniqueSponsorCouponCode,
  normalizeSponsorCouponCode,
} from '@/lib/sponsor-coupon-code'

export const dynamic = 'force-dynamic'

/**
 * GET  /api/admin/sponsor-accounts
 *   → list every sponsor account with assigned-Pulse counts.
 * POST /api/admin/sponsor-accounts
 *   → create a sponsor account; auto-generates coupon_code if missing.
 */

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()

  const { data: accounts, error } = await admin
    .from('sponsor_accounts')
    .select(
      'id, company_name, contact_email, contact_name, logo_url, status, coupon_code, notes, created_at, last_login_at'
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/sponsor-accounts GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Per-sponsor Pulse counts. Group in JS rather than relying on a view.
  const ids = (accounts ?? []).map((a) => a.id)
  const counts = new Map<string, number>()
  if (ids.length > 0) {
    const { data: rows, error: cErr } = await admin
      .from('prediction_markets')
      .select('sponsor_account_id')
      .eq('is_pulse', true)
      .in('sponsor_account_id', ids)

    if (cErr) {
      console.error('[admin/sponsor-accounts GET] count error', cErr)
    } else {
      for (const r of rows ?? []) {
        const k = (r as { sponsor_account_id: string | null }).sponsor_account_id
        if (!k) continue
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
    }
  }

  const enriched = (accounts ?? []).map((a) => ({
    ...a,
    pulse_count: counts.get(a.id) ?? 0,
  }))

  return NextResponse.json({ accounts: enriched })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  let body: {
    company_name?: string
    contact_email?: string
    contact_name?: string | null
    logo_url?: string | null
    coupon_code?: string | null
    notes?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const company_name = body.company_name?.trim()
  if (!company_name) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
  }
  // contact_email is required by the existing sponsor_accounts schema (NOT
  // NULL). Keep that contract here even though the prompt marks it optional.
  const contact_email = body.contact_email?.trim()
  if (!contact_email) {
    return NextResponse.json(
      { error: 'contact_email is required' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const coupon_code = body.coupon_code
    ? normalizeSponsorCouponCode(body.coupon_code)
    : await generateUniqueSponsorCouponCode(admin)

  const insertPayload = {
    company_name,
    contact_email,
    contact_name: body.contact_name?.trim() || null,
    logo_url: body.logo_url?.trim() || null,
    coupon_code,
    notes: body.notes ?? null,
  }

  const { data: created, error } = await admin
    .from('sponsor_accounts')
    .insert(insertPayload)
    .select(
      'id, company_name, contact_email, contact_name, logo_url, status, coupon_code, notes, access_token, created_at'
    )
    .single()

  if (error) {
    console.error('[admin/sponsor-accounts POST]', error)
    if (error.message.toLowerCase().includes('duplicate')) {
      return NextResponse.json(
        { error: 'Coupon code or contact email already in use' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ account: created }, { status: 201 })
}
