import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { ApiResponse } from '@/lib/api-responses'
import { checkRateLimit, getRateLimitIdentifier, rateLimitResponse, strictRateLimit } from '@/lib/rate-limit'
import { DONATION_MAX_MXN, DONATION_MIN_MXN, DONATION_PRODUCT_TYPE } from '@/lib/patrocinio/donations'

/**
 * POST /api/patrocinio/checkout — creates a Stripe Checkout Session (card only)
 * for a Patrocinio comunitario donation. Nothing is written to the DB here;
 * the webhook records the donation idempotently by session id once paid.
 */
const schema = z.object({
  amount_mxn: z.number().int().min(DONATION_MIN_MXN).max(DONATION_MAX_MXN),
  name: z.string().trim().max(120).optional().transform((v) => (v ? v : '')),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(320)]).optional().transform((v) => v || ''),
  anonymous: z.boolean().optional().default(false),
  locale: z.enum(['es', 'en']).optional().default('es'),
})

export async function POST(request: NextRequest) {
  const identifier = await getRateLimitIdentifier(request)
  const rl = await checkRateLimit(strictRateLimit, identifier)
  if (rl && !rl.allowed) return rateLimitResponse(rl.limit, rl.remaining, rl.reset)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return ApiResponse.badRequest('Invalid JSON', 'VALIDATION_ERROR')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return ApiResponse.badRequest(parsed.error.issues.map((i) => i.message).join(', '), 'VALIDATION_ERROR')
  }
  const d = parsed.data
  const es = d.locale === 'es'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
  const metadata: Record<string, string> = {
    product_type: DONATION_PRODUCT_TYPE,
    amount_mxn: String(d.amount_mxn),
    donor_name: d.anonymous ? '' : d.name.slice(0, 120),
    donor_email: d.email,
    is_anonymous: d.anonymous ? 'true' : 'false',
    locale: d.locale,
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      ...(d.email ? { customer_email: d.email } : {}),
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: es ? 'Patrocinio comunitario · Fondo Consciente' : 'Community sponsorship · Conscious Fund',
              description: es
                ? 'Aportación al Fondo Consciente. Se descuentan las comisiones de la tarjeta; el resto va al Fondo Consciente. No es factura ni comprobante fiscal.'
                : 'Contribution to the Conscious Fund. Card fees are deducted; the rest goes to the Conscious Fund. Not a tax invoice.',
            },
            unit_amount: d.amount_mxn * 100,
          },
          quantity: 1,
        },
      ],
      locale: es ? 'es' : 'en',
      metadata,
      payment_intent_data: { metadata },
      success_url: `${baseUrl}/patrocinio/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/patrocinio?cancelado=1#apoyar`,
    })
    return ApiResponse.ok({ url: session.url })
  } catch (err) {
    console.error('[patrocinio/checkout] stripe session failed', err instanceof Error ? err.message : err)
    return ApiResponse.serverError('Could not start checkout', 'CHECKOUT_ERROR')
  }
}
