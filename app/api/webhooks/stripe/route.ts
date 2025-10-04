import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session

      // Update sponsorship record
      const { sponsorshipId, sponsorType, brandName, taxReceipt } = session.metadata || {}

      if (sponsorshipId) {
        const { error } = await supabase
          .from('sponsorships')
          .update({
            status: 'paid',
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            paid_at: new Date().toISOString()
          })
          .eq('id', sponsorshipId)

        if (error) {
          console.error('Failed to update sponsorship:', error)
          return NextResponse.json(
            { error: 'Failed to update sponsorship' },
            { status: 500 }
          )
        }

        // Refresh materialized view for trusted brands
        if (sponsorType === 'business' && brandName) {
          await supabase.rpc('refresh_trusted_brands')
        }

        // Send confirmation email (implement later)
        // await sendSponsorshipConfirmationEmail(...)

        console.log('✅ Sponsorship updated:', sponsorshipId)
      }
      break

    case 'payment_intent.succeeded':
      console.log('💰 Payment succeeded:', event.data.object.id)
      break

    case 'payment_intent.payment_failed':
      console.log('❌ Payment failed:', event.data.object.id)
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false
  }
}