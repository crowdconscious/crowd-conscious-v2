import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { ApiResponse } from '@/lib/api-responses'

const TIER_PRICES_MXN: Record<string, number> = {
  market: 2000,
  category: 10000,
  impact: 50000,
}

const MIN_AMOUNT_MXN = 100

const TIER_LABELS: Record<string, string> = {
  market: 'Market Sponsor',
  category: 'Category Sponsor',
  impact: 'Impact Partner',
  patron: 'Founding Patron',
}

const schema = z.object({
  market_id: z.string().uuid().optional(),
  category: z.string().optional(),
  tier: z.enum(['market', 'category', 'impact', 'patron']),
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
      tier,
      amount_mxn: customAmount,
      sponsor_name,
      sponsor_url,
      sponsor_logo_url,
      email,
    } = parsed.data

    // Founding Patron = custom pricing, redirect to contact
    if (tier === 'patron') {
      const body = `Hi, I'm interested in becoming a Founding Patron.\n\nCompany/Name: ${sponsor_name}\nEmail: ${email}\n${sponsor_url ? `Website: ${sponsor_url}\n` : ''}`
      const mailto = `mailto:comunidad@crowdconscious.app?subject=${encodeURIComponent('Founding Patron Inquiry - Crowd Conscious')}&body=${encodeURIComponent(body)}`
      return ApiResponse.ok({ redirect_url: mailto, is_contact: true })
    }

    const tierPrice = TIER_PRICES_MXN[tier]
    if (!tierPrice) {
      return ApiResponse.badRequest('Invalid tier', 'INVALID_TIER')
    }

    // Use custom amount if provided (min 100 MXN), else tier price
    const priceMXN = customAmount != null && customAmount >= MIN_AMOUNT_MXN
      ? Math.round(customAmount)
      : tierPrice

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

    const tierLabel = TIER_LABELS[tier] || tier
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
        ? `Sponsor "${marketTitle}". 40% funds community causes.`
        : category
          ? `${categoryLabel} Category Sponsorship. 40% funds community causes.`
          : `Crowd Conscious ${tierLabel}. 40% funds community causes.`

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
            unit_amount: priceMXN * 100, // MXN centavos (2000 MXN = 200000)
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
        tier,
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
  } catch (err: any) {
    console.error('Sponsor checkout error:', err)
    return ApiResponse.serverError(
      err.message || 'Failed to create checkout session',
      'CHECKOUT_ERROR'
    )
  }
}
