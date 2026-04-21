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

/**
 * Stripe Webhook Handler
 * 
 * Routes incoming Stripe webhook events to appropriate handlers.
 * Each handler is responsible for a specific type of payment/transaction.
 */
export async function POST(request: NextRequest) {
  console.log('🔔 Stripe webhook received')
  console.log('🔍 Environment check:', {
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV
  })

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  console.log('📦 Request details:', {
    bodyLength: body.length,
    hasSignature: !!signature,
    signaturePreview: signature?.substring(0, 20) + '...'
  })

  if (!signature) {
    console.error('❌ No signature provided')
    return ApiResponse.badRequest('No signature provided', 'MISSING_WEBHOOK_SIGNATURE')
  }

  let event: Stripe.Event

  try {
    const stripeClient = getStripe()
    console.log('🔐 Verifying webhook signature...')
    
    event = stripeClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    
    console.log('✅ Webhook signature verified successfully')
    console.log('📋 Event type:', event.type)
    console.log('🆔 Event ID:', event.id)
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    console.error('🔍 Error details:', {
      name: err.name,
      type: err.type,
      message: err.message
    })
    return ApiResponse.badRequest(`Webhook Error: ${err.message}`, 'WEBHOOK_SIGNATURE_ERROR')
  }

  // Route event to appropriate handler
  console.log('⚡ Processing event:', event.type)
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }
  } catch (error: any) {
    console.error('❌ Error processing webhook event:', {
      eventType: event.type,
      eventId: event.id,
      error: error.message,
      stack: error.stack
    })
    // Return error to Stripe so it can retry
    return ApiResponse.serverError(
      'Failed to process webhook event',
      'WEBHOOK_PROCESSING_ERROR',
      { message: error.message, eventType: event.type }
    )
  }

  console.log('✅ Webhook response sent')
  return ApiResponse.ok({ received: true })
}

/**
 * Route checkout.session.completed events to appropriate handler
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('💳 Checkout session completed:', {
    sessionId: session.id,
    amount: session.amount_total,
    currency: session.currency,
    customerEmail: session.customer_email
  })

  const metadata = session.metadata || {}
  const { type: purchaseType } = metadata

  if (metadata.product_type === 'pulse') {
    console.log('📊 Processing Conscious Pulse purchase...')
    await handlePulsePurchase(session)
    return
  }

  if (metadata.product_type === 'pulse_addon') {
    console.log('➕ Processing Pulse add-on...')
    await handlePulseAddon(session)
    return
  }

  if (metadata.product_type === 'sponsor_upgrade') {
    console.log('⬆️  Processing sponsor in-dashboard upgrade...')
    await handleSponsorUpgrade(session)
    return
  }

  if (metadata.product_type === 'market_sponsor') {
    console.log('🎯 Processing dashboard market sponsor...')
    await handleMarketSponsorAccount(session)
    return
  }

  // Route to appropriate handler based on metadata
  if (purchaseType === 'market_sponsorship') {
    console.log('🎯 Processing market sponsorship...')
    await handleMarketSponsorship(session)
  } else if (purchaseType === 'module_purchase') {
    console.log('📚 Processing module purchase...')
    await handleModulePurchase(session)
  } else if (purchaseType === 'treasury_donation') {
    console.log('💰 Processing treasury donation...')
    await handleTreasuryDonation(session)
  } else if (session.metadata?.sponsorshipId) {
    console.log('🎁 Processing sponsorship...')
    await handleSponsorship(session)
  } else {
    console.warn('⚠️ Unknown checkout session type:', {
      purchaseType,
      hasSponsorshipId: !!session.metadata?.sponsorshipId,
      metadata: session.metadata,
    })
  }
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false
  }
}
