import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-route-guard'
import {
  generateUniqueSponsorCouponCode,
  normalizeSponsorCouponCode,
} from '@/lib/sponsor-coupon-code'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set(['active', 'paused', 'cancelled'])

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id } = await params
  const admin = createAdminClient()

  const { data: account, error } = await admin
    .from('sponsor_accounts')
    .select(
      'id, company_name, contact_email, contact_name, logo_url, status, coupon_code, notes, access_token, created_at, last_login_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[admin/sponsor-accounts/:id GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!account) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ account })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id } = await params

  let body: {
    company_name?: string
    contact_email?: string
    contact_name?: string | null
    logo_url?: string | null
    coupon_code?: string | null
    notes?: string | null
    status?: string
    /** When true and `coupon_code` not provided, regenerate a fresh one. */
    rotate_coupon_code?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = createAdminClient()

  const update: Record<string, unknown> = {}
  if (body.company_name !== undefined) {
    const v = body.company_name.trim()
    if (!v) {
      return NextResponse.json(
        { error: 'company_name cannot be empty' },
        { status: 400 }
      )
    }
    update.company_name = v
  }
  if (body.contact_email !== undefined) {
    const v = body.contact_email.trim()
    if (!v) {
      return NextResponse.json(
        { error: 'contact_email cannot be empty' },
        { status: 400 }
      )
    }
    update.contact_email = v
  }
  if (body.contact_name !== undefined) {
    update.contact_name = body.contact_name?.trim() || null
  }
  if (body.logo_url !== undefined) {
    update.logo_url = body.logo_url?.trim() || null
  }
  if (body.notes !== undefined) {
    update.notes = body.notes ?? null
  }
  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: `status must be one of ${[...ALLOWED_STATUSES].join(', ')}` },
        { status: 400 }
      )
    }
    update.status = body.status
  }
  if (body.coupon_code !== undefined && body.coupon_code !== null) {
    update.coupon_code = normalizeSponsorCouponCode(body.coupon_code)
  } else if (body.rotate_coupon_code) {
    update.coupon_code = await generateUniqueSponsorCouponCode(admin)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: updated, error } = await admin
    .from('sponsor_accounts')
    .update(update)
    .eq('id', id)
    .select(
      'id, company_name, contact_email, contact_name, logo_url, status, coupon_code, notes, access_token, created_at, last_login_at'
    )
    .maybeSingle()

  if (error) {
    console.error('[admin/sponsor-accounts/:id PATCH]', error)
    if (error.message.toLowerCase().includes('duplicate')) {
      return NextResponse.json(
        { error: 'Coupon code or contact email already in use' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ account: updated })
}
