import Stripe from 'stripe'

/**
 * Handle payment intent succeeded event
 */
export async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  console.log('💰 Payment succeeded:', {
    intentId: intent.id,
    amount: intent.amount,
    currency: intent.currency,
    customer: intent.customer
  })
  
  // Future: Add payment confirmation logic, email notifications, etc.
}

/**
 * Handle payment intent failed event
 */
export async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  console.log('❌ Payment failed:', {
    intentId: intent.id,
    amount: intent.amount,
    currency: intent.currency,
    lastError: (intent as any).last_payment_error
  })
  
  // Future: Add failure notification logic, retry mechanisms, etc.
}

