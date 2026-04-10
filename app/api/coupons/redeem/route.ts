import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

type CouponRow = {
  id: string
  code: string
  type: string
  discount_percent: number
  max_uses: number
  current_uses: number
  max_pulse_markets: number
  max_live_events: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase()
}

function tierForCouponType(type: string): string {
  if (type === 'full_access') return 'champion'
  if (type === 'sponsor_trial') return 'growth'
  return 'starter'
}

function pulseFlagsForType(type: string): { is_pulse_client: boolean; pulse_subscription_active: boolean } {
  if (type === 'full_access' || type === 'pulse_trial') {
    return { is_pulse_client: true, pulse_subscription_active: true }
  }
  if (type === 'sponsor_trial') {
    return { is_pulse_client: false, pulse_subscription_active: false }
  }
  return { is_pulse_client: false, pulse_subscription_active: false }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const codeRaw = typeof body.code === 'string' ? body.code : ''
    const emailRaw = typeof body.email === 'string' ? body.email : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const companyName = typeof body.company_name === 'string' ? body.company_name.trim() : ''

    if (!codeRaw || !emailRaw) {
      return NextResponse.json({ error: 'Code and email required' }, { status: 400 })
    }

    const code = normalizeCode(codeRaw)
    const email = normalizeEmail(emailRaw)
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: coupon, error: couponErr } = await admin
      .from('coupon_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()

    if (couponErr || !coupon) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 404 })
    }

    const c = coupon as CouponRow
    const now = new Date()
    if (c.valid_from && new Date(c.valid_from) > now) {
      return NextResponse.json({ error: 'This code is not valid yet' }, { status: 400 })
    }
    if (c.valid_until && new Date(c.valid_until) < now) {
      return NextResponse.json({ error: 'This code has expired' }, { status: 410 })
    }
    if (c.current_uses >= c.max_uses) {
      return NextResponse.json({ error: 'This code has been fully redeemed' }, { status: 410 })
    }

    const { data: existing } = await admin
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', c.id)
      .eq('redeemed_by_email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You already redeemed this code' }, { status: 409 })
    }

    const { data: existingAccount } = await admin
      .from('sponsor_accounts')
      .select('*')
      .eq('contact_email', email)
      .maybeSingle()

    const displayCompany = companyName || name || email.split('@')[0] || 'Partner'
    const pulse = pulseFlagsForType(c.type)
    const tier = tierForCouponType(c.type)

    let account = existingAccount

    if (!account) {
      const { data: inserted, error: insErr } = await admin
        .from('sponsor_accounts')
        .insert({
          company_name: displayCompany,
          contact_email: email,
          contact_name: name || null,
          tier,
          is_pulse_client: pulse.is_pulse_client,
          pulse_subscription_active: pulse.pulse_subscription_active,
          status: 'active',
        })
        .select()
        .single()

      if (insErr || !inserted) {
        console.error('[coupons/redeem] insert sponsor_accounts', insErr)
        return NextResponse.json({ error: 'Could not create sponsor account' }, { status: 500 })
      }
      account = inserted
    } else {
      const { error: updErr } = await admin
        .from('sponsor_accounts')
        .update({
          is_pulse_client: pulse.is_pulse_client || account.is_pulse_client === true,
          pulse_subscription_active:
            pulse.pulse_subscription_active || account.pulse_subscription_active === true,
          tier: c.type === 'full_access' ? tier : account.tier,
          company_name: companyName || account.company_name,
          contact_name: name || account.contact_name,
        })
        .eq('id', account.id)

      if (updErr) {
        console.error('[coupons/redeem] update sponsor_accounts', updErr)
        return NextResponse.json({ error: 'Could not update sponsor account' }, { status: 500 })
      }
    }

    const { error: redErr } = await admin.from('coupon_redemptions').insert({
      coupon_id: c.id,
      redeemed_by_email: email,
      redeemed_by_name: name || null,
      sponsor_account_id: account?.id ?? null,
    })

    if (redErr) {
      console.error('[coupons/redeem] insert redemption', redErr)
      return NextResponse.json({ error: 'Could not record redemption' }, { status: 500 })
    }

    const { data: bumped, error: bumpErr } = await admin
      .from('coupon_codes')
      .update({ current_uses: c.current_uses + 1 })
      .eq('id', c.id)
      .eq('current_uses', c.current_uses)
      .lt('current_uses', c.max_uses)
      .select('id')
      .maybeSingle()

    if (bumpErr || !bumped) {
      return NextResponse.json({ error: 'This code was just fully redeemed. Try again.' }, { status: 409 })
    }

    const token = account?.access_token
    const dashboardUrl = token ? `/dashboard/sponsor/${token}` : '/pulse'

    return NextResponse.json({
      success: true,
      dashboardUrl,
      benefits: {
        type: c.type,
        discount: c.discount_percent,
        pulseMarkets: c.max_pulse_markets,
        liveEvents: c.max_live_events,
      },
      message:
        c.discount_percent === 100
          ? 'Welcome! Your free access has been activated.'
          : `${c.discount_percent}% discount applied.`,
    })
  } catch (e) {
    console.error('[coupons/redeem]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
