import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { ApiResponse } from '@/lib/api-responses'
import { createAdminClient } from '@/lib/supabase-admin'
import { signalCategoryToPillar, fundPillarLabel } from '@/lib/fund/pillars'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIN_AMOUNT_MXN = 500

/**
 * Public sponsor checkout for a Citizen Signal (Prompt 5).
 *
 * POST /api/sponsor/signal
 *
 * Starts a Stripe Checkout Session carrying the SHARED sponsorship metadata
 * contract:
 *   { kind: 'sponsorship', surface_type: 'signal', source_id: <signal_id> }
 * (no creator_id — signals always use the pulse_signal split). The session also
 * carries the sponsor disclosure fields so the webhook can snapshot the
 * "Patrocinado" badge.
 *
 * HARD INTEGRITY BOUNDARY: this route only READS the signal (to confirm it is
 * sponsorable) — it never writes the signal's content, status, thresholds or
 * co-firma counts. The actual money/badge rows are written later by the webhook
 * (service role).
 */

const schema = z.object({
  signal_id: z.string().uuid(),
  sponsor_name: z.string().trim().min(1).max(120),
  sponsor_email: z.string().email(),
  sponsor_logo_url: z.string().url().optional(),
  badge_message: z.string().trim().max(160).optional(),
  amount_mxn: z.number().int().min(MIN_AMOUNT_MXN),
})

export async function POST(request: NextRequest) {
  try {
    if (process.env.SIGNALS_ENABLED !== 'true') {
      return ApiResponse.notFound('Signal')
    }

    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => e.message).join(', ')
      return ApiResponse.badRequest(msg, 'VALIDATION_ERROR')
    }
    const input = parsed.data

    // Read-only gate: the signal must exist and be sponsorable.
    const admin = createAdminClient()
    const { data: signal, error } = await admin
      .from('citizen_signals')
      .select('id, title, public_slug, category, sponsorable')
      .eq('id', input.signal_id)
      .maybeSingle()

    if (error) {
      console.error('[api/sponsor/signal] signal read failed', error)
      return ApiResponse.serverError('Failed to load signal', 'SIGNAL_READ_ERROR')
    }
    if (!signal) {
      return ApiResponse.notFound('Signal')
    }
    if (!signal.sponsorable) {
      return ApiResponse.forbidden(
        'This signal is not enabled for sponsorship',
        'SIGNAL_NOT_SPONSORABLE'
      )
    }

    const pillar = signalCategoryToPillar(signal.category as string | null)
    const stripe = getStripe()
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://crowdconscious.app'

    const badgeMessage =
      input.badge_message?.trim() || `Patrocinado por ${input.sponsor_name}`
    const productName = `Patrocinio · ${signal.title as string}`
    const description = `Patrocinio transparente de una Señal Ciudadana. 20% al Fondo Consciente (pilar ${fundPillarLabel(
      pillar,
      'es'
    )}).`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: productName,
              description,
              images: input.sponsor_logo_url ? [input.sponsor_logo_url] : undefined,
            },
            unit_amount: input.amount_mxn * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/signals/${signal.public_slug as string}?sponsored=1`,
      cancel_url: `${baseUrl}/sponsor/signal/${input.signal_id}?cancelled=1`,
      customer_email: input.sponsor_email,
      metadata: {
        // SHARED sponsorship contract (consumed by the Stripe webhook).
        kind: 'sponsorship',
        surface_type: 'signal',
        source_id: input.signal_id,
        // Additive sponsor disclosure fields for the snapshot + badge.
        sponsor_name: input.sponsor_name,
        sponsor_email: input.sponsor_email,
        sponsor_logo_url: input.sponsor_logo_url || '',
        badge_message: badgeMessage,
        fund_pillar: pillar,
      },
    })

    return ApiResponse.ok({ url: session.url, session_id: session.id })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to create checkout session'
    console.error('[api/sponsor/signal] error', err)
    return ApiResponse.serverError(message, 'CHECKOUT_ERROR')
  }
}
