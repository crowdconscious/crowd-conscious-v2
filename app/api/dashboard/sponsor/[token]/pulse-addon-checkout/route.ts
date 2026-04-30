import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { createAdminClient } from '@/lib/supabase-admin'
import { PULSE_TIERS, calculatePulseFundAllocationRounded, normalizePulseTierId } from '@/lib/pulse-tiers'

export const dynamic = 'force-dynamic'

/**
 * Buy +1 Pulse slot (Pulse Único pricing) for an existing sponsor account.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const admin = createAdminClient()

    const { data: account, error: accErr } = await admin
      .from('sponsor_accounts')
      .select('id, contact_email, company_name, logo_url, is_pulse_client, status')
      .eq('access_token', token)
      .eq('status', 'active')
      .maybeSingle()

    if (accErr || !account) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    if (account.is_pulse_client !== true) {
      return NextResponse.json({ error: 'Pulse add-on is for Pulse clients' }, { status: 403 })
    }

    const tierId = normalizePulseTierId('pulse_unico')
    const priceMXN = PULSE_TIERS.pulse_unico.priceMXN
    const alloc = calculatePulseFundAllocationRounded(priceMXN, tierId)

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Pulse add-on — ${account.company_name ?? 'Cliente'}`,
              description: `+1 consulta Pulse. ~${Math.round(alloc.fundPercent * 100)}% estimado al Fondo Consciente.`,
              images: account.logo_url ? [account.logo_url] : undefined,
            },
            unit_amount: priceMXN * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/para-marcas/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/sponsor/${encodeURIComponent(token)}`,
      customer_email: account.contact_email ?? undefined,
      allow_promotion_codes: true,
      metadata: {
        product_type: 'pulse_addon',
        sponsor_account_id: account.id,
        quantity: '1',
        fund_amount_estimated_mxn: String(alloc.fundAmountRounded),
      },
    })

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (e) {
    console.error('[pulse-addon-checkout]', e)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 })
  }
}
