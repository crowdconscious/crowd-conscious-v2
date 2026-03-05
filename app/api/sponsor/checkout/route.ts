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
      sponsor_name,
      sponsor_url,
      sponsor_logo_url,
      email,
    } = parsed.data

    // Founding Patron = custom pricing, redirect to contact
    if (tier === 'patron') {
      const body = `Hi, I'm interested in becoming a Founding Patron.\n\nCompany/Name: ${sponsor_name}\nEmail: ${email}\n${sponsor_url ? `Website: ${sponsor_url}\n` : ''}`
      const mailto = `mailto:francisco@crowdconscious.app?subject=${encodeURIComponent('Founding Patron Inquiry - Crowd Conscious')}&body=${encodeURIComponent(body)}`
      return ApiResponse.ok({ redirect_url: mailto, is_contact: true })
    }

    const priceMXN = TIER_PRICES_MXN[tier]
    if (!priceMXN) {
      return ApiResponse.badRequest('Invalid tier', 'INVALID_TIER')
    }

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

    const tierLabel = TIER_LABELS[tier] || tier
    const marketTitle = market_id ? undefined : undefined // We'll fetch if needed, for now description is generic
    const categoryLabel = category || 'selected'
    const description =
      market_id
        ? `Sponsor a specific market`
        : category
          ? `${categoryLabel} Category Sponsorship`
          : `${tierLabel} - Crowd Conscious`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Crowd Conscious - ${tierLabel}`,
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
