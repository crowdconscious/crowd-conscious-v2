import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  PULSE_TIERS,
  calculatePulseFundAllocationRounded,
  type PulseTierId,
} from '@/lib/pulse-tiers'
import { isCheckoutableTarget } from '@/lib/sponsor-upgrade-tier'

export const dynamic = 'force-dynamic'

/**
 * In-dashboard tier upgrade checkout.
 *
 * Unlike `app/api/pulse/checkout/route.ts` (the public acquisition flow),
 * this endpoint takes a sponsor token → resolves the existing
 * sponsor_account → creates a Stripe checkout session that, on success,
 * will UPDATE that account's tier in place via the sponsor-upgrade webhook
 * handler. No new sponsor_account is created.
 *
 * Not usable for `enterprise` (contact-sales) or `pilot` (acquisition-only)
 * — the client UI gates those separately.
 */

const schema = z.object({
  target_tier: z.enum(['pulse_unico', 'pulse_pack', 'suscripcion']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token?: string }> }
) {
  // This route is registered at /api/sponsor/upgrade — the token is passed
  // in the body rather than the URL so we don't leak it in server logs
  // beyond what the token-URL dashboard already does.
  try {
    const body = await request.json().catch(() => ({}))
    const token =
      typeof body.token === 'string' && body.token.length > 0
        ? body.token
        : (await params).token
    if (!token) {
      return NextResponse.json({ error: 'Missing sponsor token' }, { status: 400 })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid target_tier' },
        { status: 400 }
      )
    }
    const targetTier: PulseTierId = parsed.data.target_tier
    if (!isCheckoutableTarget(targetTier)) {
      return NextResponse.json(
        { error: 'Tier cannot be purchased via checkout' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: account, error: accErr } = await admin
      .from('sponsor_accounts')
      .select(
        'id, contact_email, company_name, logo_url, tier, status, access_token'
      )
      .eq('access_token', token)
      .eq('status', 'active')
      .maybeSingle()

    if (accErr || !account) {
      return NextResponse.json(
        { error: 'Invalid or expired sponsor link' },
        { status: 404 }
      )
    }

    const tierDef = PULSE_TIERS[targetTier]
    if (!tierDef) {
      return NextResponse.json({ error: 'Unknown target tier' }, { status: 400 })
    }
    const priceMXN = tierDef.priceMXN
    if (!priceMXN || priceMXN <= 0) {
      return NextResponse.json(
        { error: 'Tier is not priced for self-serve checkout' },
        { status: 400 }
      )
    }

    const alloc = calculatePulseFundAllocationRounded(priceMXN, targetTier)
    const fundPctLabel = Math.round(alloc.fundPercent * 100)
    const productName = `Upgrade a ${tierDef.name} — ${account.company_name ?? 'Cliente'}`
    const description = `Mejora de plan en el panel de patrocinador. ~${fundPctLabel}% estimado al Fondo Consciente.`

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
    const tokenEnc = encodeURIComponent(token)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: productName,
              description,
              images: account.logo_url ? [account.logo_url] : undefined,
            },
            unit_amount: priceMXN * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/dashboard/sponsor/${tokenEnc}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/sponsor/${tokenEnc}/upgrade`,
      customer_email: account.contact_email ?? undefined,
      allow_promotion_codes: true,
      metadata: {
        product_type: 'sponsor_upgrade',
        existing_sponsor_account_id: account.id,
        target_tier: targetTier,
        previous_tier: account.tier ?? '',
        fund_amount_estimated_mxn: String(alloc.fundAmountRounded),
      },
    })

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (e) {
    console.error('[sponsor/upgrade] checkout error', e)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 })
  }
}
