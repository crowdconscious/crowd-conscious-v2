import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { ApiResponse } from '@/lib/api-responses'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  SPONSOR_TIERS,
  type SponsorTierId,
  calculateFundAllocationRounded,
} from '@/lib/sponsor-tiers'

const MIN_AMOUNT_MXN = 100

type CouponRow = {
  id: string
  discount_percent: number
  max_uses: number
  current_uses: number
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

async function resolveCouponPrice(params: {
  couponCode: string
  email: string
  basePriceMXN: number
}): Promise<
  | {
      ok: true
      priceMXN: number
      originalPriceMXN: number
      couponId: string
      discountPercent: number
    }
  | { ok: false; message: string }
> {
  const admin = createAdminClient()
  const code = normalizeCode(params.couponCode)
  const email = normalizeEmail(params.email)

  const { data: coupon, error } = await admin
    .from('coupon_codes')
    .select('id, discount_percent, max_uses, current_uses, valid_from, valid_until, is_active')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !coupon) {
    return { ok: false, message: 'Invalid or inactive coupon code' }
  }

  const c = coupon as CouponRow
  const now = new Date()
  if (c.valid_from && new Date(c.valid_from) > now) {
    return { ok: false, message: 'This code is not valid yet' }
  }
  if (c.valid_until && new Date(c.valid_until) < now) {
    return { ok: false, message: 'This code has expired' }
  }
  if (c.current_uses >= c.max_uses) {
    return { ok: false, message: 'This code has been fully redeemed' }
  }

  const { data: existing } = await admin
    .from('coupon_redemptions')
    .select('id')
    .eq('coupon_id', c.id)
    .eq('redeemed_by_email', email)
    .maybeSingle()

  if (existing) {
    return { ok: false, message: 'You already redeemed this code' }
  }

  if (c.discount_percent >= 100) {
    return {
      ok: false,
      message:
        'This code covers the full amount. Continue without Stripe — your session will activate free access.',
    }
  }

  const originalPriceMXN = params.basePriceMXN
  const discounted = Math.round(originalPriceMXN * (1 - c.discount_percent / 100))
  const priceMXN = Math.max(MIN_AMOUNT_MXN, discounted)

  return {
    ok: true,
    priceMXN,
    originalPriceMXN,
    couponId: c.id,
    discountPercent: c.discount_percent,
  }
}

const TIER_LABELS: Record<SponsorTierId, string> = {
  starter: 'Market Sponsor',
  growth: 'Category Sponsor',
  champion: 'Impact Partner',
  anchor: 'Founding Patron',
}

const schema = z.object({
  market_id: z.string().uuid().optional(),
  category: z.string().optional(),
  tier: z.enum(['starter', 'growth', 'champion', 'anchor']),
  amount_mxn: z.number().min(MIN_AMOUNT_MXN).optional(),
  sponsor_name: z.string().min(1),
  sponsor_url: z.string().optional(),
  sponsor_logo_url: z.string().optional(),
  email: z.string().email(),
  coupon_code: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => e.message).join(', ')
      return ApiResponse.badRequest(msg, 'VALIDATION_ERROR')
    }

    const {
      market_id,
      category,
      tier: tierId,
      amount_mxn: customAmount,
      sponsor_name,
      sponsor_url,
      sponsor_logo_url,
      email,
      coupon_code: couponCodeRaw,
    } = parsed.data

    const tier = SPONSOR_TIERS[tierId]
    const tierPrice = tier.price

    let basePriceMXN =
      customAmount != null && customAmount >= MIN_AMOUNT_MXN ? Math.round(customAmount) : tierPrice

    let priceMXN = basePriceMXN
    let couponId: string | null = null
    let couponDiscountPercent: number | null = null
    let originalAmountMxnForMeta: string | null = null

    if (couponCodeRaw?.trim()) {
      const resolved = await resolveCouponPrice({
        couponCode: couponCodeRaw,
        email,
        basePriceMXN,
      })
      if (!resolved.ok) {
        return ApiResponse.badRequest(resolved.message, 'COUPON_INVALID')
      }
      priceMXN = resolved.priceMXN
      couponId = resolved.couponId
      couponDiscountPercent = resolved.discountPercent
      originalAmountMxnForMeta = String(resolved.originalPriceMXN)
    }

    const alloc = calculateFundAllocationRounded(priceMXN, tierId)
    const fundPctLabel = Math.round(tier.fundPercent * 100)

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

    const tierLabel = TIER_LABELS[tierId] || tier.name
    let marketTitle: string | undefined
    let isPulseMarket = false
    if (market_id) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: m } = await supabase
        .from('prediction_markets')
        .select('title, is_pulse')
        .eq('id', market_id)
        .single()
      marketTitle = m?.title
      isPulseMarket = Boolean((m as { is_pulse?: boolean } | null)?.is_pulse)
    }
    const categoryLabel = category || 'selected'
    const productName = marketTitle
      ? `${tierLabel} — ${marketTitle}`
      : category
        ? `${tierLabel} — ${categoryLabel} Category`
        : `${tierLabel} — Crowd Conscious`
    const description =
      market_id && marketTitle
        ? `Sponsor "${marketTitle}". Up to ${fundPctLabel}% to Conscious Fund (after fees).`
        : category
          ? `${categoryLabel} category sponsorship. Up to ${fundPctLabel}% to Conscious Fund (after fees).`
          : `Crowd Conscious ${tierLabel}. Up to ${fundPctLabel}% to Conscious Fund (after fees).`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: productName,
              description,
              images: sponsor_logo_url ? [sponsor_logo_url] : undefined,
            },
            unit_amount: priceMXN * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/sponsor/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/sponsor/cancelled`,
      customer_email: email,
      metadata: {
        type: 'market_sponsorship',
        tier: tierId,
        sponsor_tier: tierId,
        fund_percent: String(tier.fundPercent),
        fund_amount_estimated_mxn: String(alloc.fundAmountRounded),
        platform_amount_estimated_mxn: String(alloc.platformAmountRounded),
        market_id: market_id || '',
        category: category || '',
        company_name: sponsor_name,
        sponsor_name,
        sponsor_url: sponsor_url || '',
        sponsor_logo_url: sponsor_logo_url || '',
        sponsor_email: email,
        is_pulse: isPulseMarket ? 'true' : 'false',
        ...(couponId
          ? {
              coupon_id: couponId,
              coupon_discount_percent: String(couponDiscountPercent ?? ''),
              original_amount_mxn: originalAmountMxnForMeta ?? '',
            }
          : {}),
      },
    })

    return ApiResponse.ok({
      url: session.url,
      session_id: session.id,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session'
    console.error('Sponsor checkout error:', err)
    return ApiResponse.serverError(message, 'CHECKOUT_ERROR')
  }
}
