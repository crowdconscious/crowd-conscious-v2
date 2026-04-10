import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  SPONSOR_TIERS,
  calculateFundAllocationRounded,
  type SponsorTierId,
} from '@/lib/sponsor-tiers'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  market_id: z.string().uuid(),
})

const MARKET_SPONSOR_TIER: SponsorTierId = 'starter'

/**
 * $3,000 MXN — associate sponsor account with an existing platform market.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const json = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'market_id required' }, { status: 400 })
    }
    const { market_id: marketId } = parsed.data

    const admin = createAdminClient()

    const { data: account, error: accErr } = await admin
      .from('sponsor_accounts')
      .select('id, contact_email, company_name, logo_url, status')
      .eq('access_token', token)
      .eq('status', 'active')
      .maybeSingle()

    if (accErr || !account) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    const { data: market, error: mErr } = await admin
      .from('prediction_markets')
      .select('id, title, sponsor_name, status')
      .eq('id', marketId)
      .maybeSingle()

    if (mErr || !market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    if (!['active', 'trading'].includes(String(market.status))) {
      return NextResponse.json({ error: 'Market is not open for sponsorship' }, { status: 400 })
    }

    if (market.sponsor_name && String(market.sponsor_name).trim()) {
      return NextResponse.json({ error: 'This market already has a sponsor' }, { status: 409 })
    }

    const tier = SPONSOR_TIERS[MARKET_SPONSOR_TIER]
    const priceMXN = tier.price
    const alloc = calculateFundAllocationRounded(priceMXN, MARKET_SPONSOR_TIER)

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Patrocinar mercado — ${(market.title as string).slice(0, 80)}`,
              description: `Market Sponsor. ~${Math.round(alloc.fundPercent * 100)}% estimado al Fondo Consciente.`,
              images: account.logo_url ? [account.logo_url] : undefined,
            },
            unit_amount: priceMXN * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/dashboard/sponsor/${encodeURIComponent(token)}?sponsored=1`,
      cancel_url: `${baseUrl}/markets?sponsor_mode=true&token=${encodeURIComponent(token)}`,
      customer_email: account.contact_email ?? undefined,
      allow_promotion_codes: true,
      metadata: {
        product_type: 'market_sponsor',
        tier: MARKET_SPONSOR_TIER,
        market_id: marketId,
        sponsor_account_id: account.id,
        company_name: account.company_name ?? '',
        contact_email: account.contact_email ?? '',
        logo_url: account.logo_url ?? '',
        fund_amount_estimated_mxn: String(alloc.fundAmountRounded),
      },
    })

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (e) {
    console.error('[market-sponsor-checkout]', e)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 })
  }
}
