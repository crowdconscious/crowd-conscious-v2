import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { ApiResponse } from '@/lib/api-responses'
import { createAdminClient } from '@/lib/supabase-admin'
import { PULSE_TIERS, calculatePulseFundAllocationRounded, type PulseTierId } from '@/lib/pulse-tiers'

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

const tierEnum = z.enum([
  'pilot',
  'pulse_unico',
  'pulse_pack',
  'suscripcion',
  'mundial_pack',
  'mundial_pack_founding',
])

const schema = z
  .object({
    tier: tierEnum,
    company_name: z.string().min(1),
    contact_email: z.string().email(),
    website: z.string().optional(),
    logo_url: z.string().optional(),
    coupon_code: z.string().optional(),
    contact_name: z.string().trim().optional(),
    brand_pitch: z.string().trim().max(280).optional(),
    // Optional attribution tag (e.g. "pilot_landing", "mundial_card") so
    // we can tell which surface drove the checkout. Capped to keep
    // Stripe metadata under their 500-char-per-value limit.
    source: z.string().trim().max(64).optional(),
  })
  .superRefine((data, ctx) => {
    // Mundial Pack tiers warrant a real contact name + a one-sentence pitch
    // because the founder follows up personally within 24h. Other tiers stay
    // optional so the cheap SKUs keep their frictionless checkout.
    const isMundial = data.tier === 'mundial_pack' || data.tier === 'mundial_pack_founding'
    if (!isMundial) return
    if (!data.contact_name || !data.contact_name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contact_name'],
        message: 'contact_name is required for Mundial Pack',
      })
    }
    if (!data.brand_pitch || !data.brand_pitch.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['brand_pitch'],
        message: 'brand_pitch is required for Mundial Pack',
      })
    }
  })

const TIER_LABELS: Record<PulseTierId, string> = {
  pilot: 'Pilot Pulse',
  pulse_unico: 'Pulse Único',
  pulse_pack: 'Pulse Pack (3)',
  suscripcion: 'Suscripción Pulse',
  mundial_pack: 'Mundial Pulse Pack',
  mundial_pack_founding: 'Mundial Pulse Pack — Founding',
  enterprise: 'Enterprise',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => e.message).join(', ')
      return ApiResponse.badRequest(msg, 'VALIDATION_ERROR')
    }

    const {
      tier: tierId,
      company_name,
      contact_email,
      website,
      logo_url,
      coupon_code: couponCodeRaw,
      contact_name,
      brand_pitch,
      source,
    } = parsed.data

    const tier = PULSE_TIERS[tierId]
    const basePriceMXN: number = tier.priceMXN

    let priceMXN: number = basePriceMXN
    let couponId: string | null = null
    let couponDiscountPercent: number | null = null
    let originalAmountMxnForMeta: string | null = null

    if (couponCodeRaw?.trim()) {
      const resolved = await resolveCouponPrice({
        couponCode: couponCodeRaw,
        email: contact_email,
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

    const alloc = calculatePulseFundAllocationRounded(priceMXN, tierId)
    const fundPctLabel = Math.round(alloc.fundPercent * 100)

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

    const tierLabel = TIER_LABELS[tierId] || tier.name
    const productName = `Conscious Pulse — ${tierLabel}`
    const description = `${tierLabel}. Hasta ${fundPctLabel}% estimado al Fondo Consciente (neto después de comisiones).`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: productName,
              description,
              images: logo_url ? [logo_url] : undefined,
            },
            unit_amount: priceMXN * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/para-marcas/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pulse`,
      customer_email: contact_email,
      allow_promotion_codes: true,
      metadata: {
        product_type: 'pulse',
        tier: tierId,
        company_name,
        contact_email,
        contact_name: contact_name?.trim() || '',
        brand_pitch: brand_pitch?.trim() || '',
        logo_url: logo_url || '',
        website: website || '',
        coupon_id: couponId || '',
        fund_percent: String(alloc.fundPercent),
        fund_amount_estimated_mxn: String(alloc.fundAmountRounded),
        platform_amount_estimated_mxn: String(alloc.platformAmountRounded),
        ...(source ? { source } : {}),
        ...(couponId
          ? {
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
    console.error('Pulse checkout error:', err)
    return ApiResponse.serverError(message, 'CHECKOUT_ERROR')
  }
}
