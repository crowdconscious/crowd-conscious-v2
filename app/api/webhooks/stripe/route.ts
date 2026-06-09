import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { ApiResponse } from '@/lib/api-responses'
import { getStripe } from './lib/stripe-webhook-utils'
import { handleModulePurchase } from './handlers/module-purchase'
import { handleSponsorship } from './handlers/sponsorship'
import { handleMarketSponsorship } from './handlers/market-sponsorship'
import { handlePulsePurchase } from './handlers/pulse-purchase'
import { handlePulseAddon } from './handlers/pulse-addon'
import { handleSponsorUpgrade } from './handlers/sponsor-upgrade'
import { handleMarketSponsorAccount } from './handlers/market-sponsor-account'
import { handleTreasuryDonation } from './handlers/treasury-donation'
import { handlePaymentSucceeded, handlePaymentFailed } from './handlers/payment-verification'
import { handleSponsorshipCheckout } from './handlers/sponsorship-checkout'
import {
  handleSponsorshipRefund,
  handleSponsorshipDispute,
} from './handlers/sponsorship-refund'
import { SPONSORSHIP_KIND } from './lib/sponsorship-money'

/**
 * Stripe Webhook Handler
 * 
 * Routes incoming Stripe webhook events to appropriate handlers.
 * Each handler is responsible for a specific type of payment/transaction.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('[stripe-webhook] missing stripe-signature header', {
      bodyLength: body.length,
    })
    return ApiResponse.badRequest('No signature provided', 'MISSING_WEBHOOK_SIGNATURE')
  }

  let event: Stripe.Event

  try {
    const stripeClient = getStripe()
    event = stripeClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('[stripe-webhook] signature verification failed', {
      name: err?.name,
      type: err?.type,
      message: err?.message,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      bodyLength: body.length,
    })
    return ApiResponse.badRequest(`Webhook Error: ${err.message}`, 'WEBHOOK_SIGNATURE_ERROR')
  }

  // Idempotency / audit: log every event id we receive so re-deliveries are
  // traceable. The per-row UNIQUE constraints (creator_sponsorships
  // .stripe_session_id) and status guards make the actual writes idempotent.
  console.log('[stripe-webhook] event received', {
    eventId: event.id,
    eventType: event.type,
  })

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          event.id
        )
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      // Creator-market sponsorship reversals (Prompt 3).
      case 'charge.refunded':
        await handleSponsorshipRefund(event.data.object as Stripe.Charge)
        break

      case 'charge.dispute.created':
        await handleSponsorshipDispute(event.data.object as Stripe.Dispute)
        break

      default:
        console.log('[stripe-webhook] unhandled event type', {
          eventType: event.type,
          eventId: event.id,
        })
    }
  } catch (error: any) {
    console.error('[stripe-webhook] event processing failed', {
      eventType: event.type,
      eventId: event.id,
      error: error?.message,
      stack: error?.stack,
    })
    return ApiResponse.serverError(
      'Failed to process webhook event',
      'WEBHOOK_PROCESSING_ERROR',
      { message: error.message, eventType: event.type }
    )
  }

  return ApiResponse.ok({ received: true })
}

/**
 * Route checkout.session.completed events to appropriate handler
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const metadata = session.metadata || {}
  const { type: purchaseType } = metadata

  // Creator-market sponsorship (Prompt 3). Shared metadata contract:
  // { kind: 'sponsorship', surface_type, source_id, creator_id? }. Checked
  // first so it owns blog/signal/pulse sponsorship sessions from both workers.
  if (metadata.kind === SPONSORSHIP_KIND) {
    await handleSponsorshipCheckout({
      ...session,
      metadata: { ...metadata, stripe_event_id: eventId },
    })
    return
  }

  if (metadata.product_type === 'pulse') {
    await handlePulsePurchase(session)
    return
  }

  if (metadata.product_type === 'pulse_addon') {
    await handlePulseAddon(session)
    return
  }

  if (metadata.product_type === 'sponsor_upgrade') {
    await handleSponsorUpgrade(session)
    return
  }

  if (metadata.product_type === 'market_sponsor') {
    await handleMarketSponsorAccount(session)
    return
  }

  if (purchaseType === 'market_sponsorship') {
    await handleMarketSponsorship(session)
  } else if (purchaseType === 'module_purchase') {
    await handleModulePurchase(session)
  } else if (purchaseType === 'treasury_donation') {
    await handleTreasuryDonation(session)
  } else if (session.metadata?.sponsorshipId) {
    await handleSponsorship(session)
  } else {
    console.warn('[stripe-webhook] unknown checkout session type', {
      sessionId: session.id,
      purchaseType,
      productType: metadata.product_type,
      hasSponsorshipId: !!session.metadata?.sponsorshipId,
    })
  }
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false
  }
}
