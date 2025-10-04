import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Initialize Stripe lazily to avoid build-time errors
let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil'
    })
  }
  return stripe
}

// Initialize Supabase lazily to avoid build-time errors
let supabase: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!supabase) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are not set')
    }
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return supabase
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    const stripeClient = getStripe()
    event = stripeClient.webhooks.constructEvent(
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
        const updateData: any = {
          status: 'paid',
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          paid_at: new Date().toISOString()
        }
        
        const supabaseClient = getSupabase()
        const { error } = await (supabaseClient as any)
          .from('sponsorships')
          .update(updateData)
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
          await supabaseClient.rpc('refresh_trusted_brands')
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