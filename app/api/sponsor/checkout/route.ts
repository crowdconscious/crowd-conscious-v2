import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { ApiResponse } from '@/lib/api-responses'
import {
  SPONSOR_TIERS,
  type SponsorTierId,
  calculateFundAllocationRounded,
} from '@/lib/sponsor-tiers'

const MIN_AMOUNT_MXN = 100

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
    } = parsed.data

    const tier = SPONSOR_TIERS[tierId]
    const tierPrice = tier.price

    const priceMXN =
      customAmount != null && customAmount >= MIN_AMOUNT_MXN ? Math.round(customAmount) : tierPrice

    const alloc = calculateFundAllocationRounded(priceMXN, tierId)
    const fundPctLabel = Math.round(tier.fundPercent * 100)

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

    const tierLabel = TIER_LABELS[tierId] || tier.name
    let marketTitle: string | undefined
    if (market_id) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: m } = await supabase
        .from('prediction_markets')
        .select('title')
        .eq('id', market_id)
        .single()
      marketTitle = m?.title
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
        sponsor_name,
        sponsor_url: sponsor_url || '',
        sponsor_logo_url: sponsor_logo_url || '',
        sponsor_email: email,
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
