import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const codeRaw = typeof body.code === 'string' ? body.code : ''
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : ''

    if (!codeRaw.trim()) {
      return ApiResponse.badRequest('Code required', 'VALIDATION_ERROR')
    }

    const code = normalizeCode(codeRaw)
    const admin = createAdminClient()

    const { data: coupon, error: couponErr } = await admin
      .from('coupon_codes')
      .select(
        'id, code, type, discount_percent, max_uses, current_uses, max_pulse_markets, max_live_events, valid_from, valid_until, is_active'
      )
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()

    if (couponErr || !coupon) {
      return ApiResponse.ok({
        valid: false as const,
        error: 'Invalid code',
      })
    }

    const c = coupon as CouponRow
    const now = new Date()
    if (c.valid_from && new Date(c.valid_from) > now) {
      return ApiResponse.ok({
        valid: false as const,
        error: 'This code is not valid yet',
      })
    }
    if (c.valid_until && new Date(c.valid_until) < now) {
      return ApiResponse.ok({
        valid: false as const,
        error: 'This code has expired',
      })
    }
    if (c.current_uses >= c.max_uses) {
      return ApiResponse.ok({
        valid: false as const,
        error: 'This code has been fully redeemed',
      })
    }

    if (emailRaw && emailRaw.includes('@')) {
      const email = normalizeEmail(emailRaw)
      const { data: existing } = await admin
        .from('coupon_redemptions')
        .select('id')
        .eq('coupon_id', c.id)
        .eq('redeemed_by_email', email)
        .maybeSingle()

      if (existing) {
        return ApiResponse.ok({
          valid: false as const,
          error: 'You already redeemed this code',
        })
      }
    }

    return ApiResponse.ok({
      valid: true as const,
      discount_percent: c.discount_percent,
      type: c.type,
      coupon_id: c.id,
      benefits: {
        pulseMarkets: c.max_pulse_markets,
        liveEvents: c.max_live_events,
      },
    })
  } catch (e) {
    console.error('[coupons/validate]', e)
    return ApiResponse.serverError('Server error', 'INTERNAL')
  }
}
