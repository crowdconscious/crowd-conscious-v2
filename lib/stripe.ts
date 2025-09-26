import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Platform fee configuration (15% as per rebuild strategy)
export const PLATFORM_FEE_PERCENTAGE = 15 // 15%

export function calculatePlatformFee(amount: number): number {
  return Math.round((amount * PLATFORM_FEE_PERCENTAGE) / 100)
}

export function calculateNetAmount(amount: number): number {
  return amount - calculatePlatformFee(amount)
}

// Create payment intent for sponsorship
export async function createSponsorshipPaymentIntent(
  amount: number, // Amount in dollars
  sponsorshipId: string,
  brandId: string,
  communityId: string,
  contentId: string
) {
  const amountCents = Math.round(amount * 100) // Convert to cents
  const platformFeeCents = calculatePlatformFee(amountCents)
  const netAmountCents = amountCents - platformFeeCents

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      application_fee_amount: platformFeeCents, // Platform fee goes to us
      metadata: {
        sponsorshipId,
        brandId,
        communityId,
        contentId,
        platformFee: platformFeeCents.toString(),
        netAmount: netAmountCents.toString(),
        type: 'sponsorship'
      },
      description: `Sponsorship payment for community need`,
    })

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountCents,
      platformFee: platformFeeCents,
      netAmount: netAmountCents
    }
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw new Error('Failed to create payment intent')
  }
}

// Webhook handler for payment confirmations
export async function handleStripeWebhook(
  payload: string,
  signature: string
): Promise<{ success: boolean; type?: string; data?: any }> {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return { success: false }
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      return {
        success: true,
        type: 'payment_succeeded',
        data: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          metadata: paymentIntent.metadata
        }
      }

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent
      return {
        success: true,
        type: 'payment_failed',
        data: {
          paymentIntentId: failedPayment.id,
          metadata: failedPayment.metadata
        }
      }

    default:
      console.log(`Unhandled event type: ${event.type}`)
      return { success: true }
  }
}

// Get Stripe public key for frontend
export function getStripePublicKey(): string {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
  }
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
}
