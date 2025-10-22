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
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
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
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  // Handle the event
  console.log('⚡ Processing event:', event.type)
  
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      console.log('💳 Checkout session completed:', {
        sessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_email
      })

      // Update sponsorship record
      const { 
        sponsorshipId, 
        sponsorType, 
        brandName, 
        taxReceipt,
        platformFeeAmount,
        founderAmount,
        connectedAccountId,
        coverPlatformFee,
        originalSponsorshipAmount
      } = session.metadata || {}
      
      console.log('📝 Session metadata:', {
        sponsorshipId,
        sponsorType,
        brandName,
        taxReceipt,
        platformFeeAmount,
        founderAmount,
        hasConnectedAccount: !!connectedAccountId,
        coverPlatformFee: coverPlatformFee === 'yes',
        originalSponsorshipAmount
      })

      if (sponsorshipId) {
        console.log('🔄 Updating sponsorship:', sponsorshipId)
        
        const updateData: any = {
          status: 'paid',
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          paid_at: new Date().toISOString(),
          platform_fee_amount: platformFeeAmount ? parseFloat(platformFeeAmount) : null,
          founder_amount: founderAmount ? parseFloat(founderAmount) : null
        }
        
        // If payment was made via Connect, get the transfer ID
        if (connectedAccountId && session.payment_intent) {
          try {
            const stripeClient = getStripe()
            const paymentIntent = await stripeClient.paymentIntents.retrieve(
              session.payment_intent as string,
              { expand: ['transfer_data'] }
            )
            
            if (paymentIntent.transfer_data?.destination) {
              updateData.stripe_transfer_id = paymentIntent.transfer_data.destination
              console.log('✅ Found transfer ID:', updateData.stripe_transfer_id)
            }
          } catch (transferError) {
            console.error('⚠️ Error retrieving transfer data:', transferError)
            // Continue anyway - not critical
          }
        }
        
        const supabaseClient = getSupabase()
        const { error } = await (supabaseClient as any)
          .from('sponsorships')
          .update(updateData)
          .eq('id', sponsorshipId)

        if (error) {
          console.error('❌ Failed to update sponsorship:', error)
          console.error('🔍 Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          })
          return NextResponse.json(
            { error: 'Failed to update sponsorship' },
            { status: 500 }
          )
        }

        console.log('✅ Sponsorship updated successfully:', sponsorshipId)
        
        if (connectedAccountId) {
          console.log('💰 Payment split:', {
            total: session.amount_total,
            platformFee: platformFeeAmount,
            founderPayout: founderAmount,
            destination: connectedAccountId,
            feeCoveredBySponsor: coverPlatformFee === 'yes',
            originalAmount: originalSponsorshipAmount
          })
        }
        
        // Log extra generosity if platform fee was covered
        if (coverPlatformFee === 'yes') {
          console.log('💚 Generous sponsor covered the platform fee! Creator receives 100% of sponsorship amount.')
        }

        // Refresh materialized view for trusted brands
        if (sponsorType === 'business' && brandName) {
          console.log('🔄 Refreshing trusted brands view...')
          const { error: refreshError } = await supabaseClient.rpc('refresh_trusted_brands')
          if (refreshError) {
            console.error('⚠️ Failed to refresh trusted brands:', refreshError)
          } else {
            console.log('✅ Trusted brands view refreshed')
          }
        }

        // Send confirmation email (implement later)
        // await sendSponsorshipConfirmationEmail(...)

        console.log('🎉 Webhook processing completed successfully')
      } else if (session.metadata?.type === 'treasury_donation') {
        // Handle treasury donation
        console.log('💰 Processing treasury donation')
        const { community_id, donor_id, donor_email, donor_name, amount } = session.metadata
        
        if (community_id && amount) {
          try {
            const supabaseClient = getSupabase()
            
            // Add donation to treasury using RPC function
            const { data, error } = await (supabaseClient as any).rpc('add_treasury_donation', {
              p_community_id: community_id,
              p_amount: parseFloat(amount),
              p_donor_id: donor_id || null,
              p_donor_email: donor_email || session.customer_email || null,
              p_donor_name: donor_name || null,
              p_stripe_payment_intent_id: session.payment_intent as string || null,
              p_description: `Donation to community pool via Stripe`
            })
            
            if (error) {
              console.error('❌ Failed to add treasury donation:', error)
              return NextResponse.json(
                { error: 'Failed to add treasury donation' },
                { status: 500 }
              )
            }
            
            console.log('✅ Treasury donation added successfully:', data)
            console.log('🎉 Treasury webhook processing completed successfully')
          } catch (treasuryError) {
            console.error('❌ Treasury donation error:', treasuryError)
            return NextResponse.json(
              { error: 'Treasury donation processing failed' },
              { status: 500 }
            )
          }
        } else {
          console.warn('⚠️ Missing required metadata for treasury donation')
        }
      } else {
        console.warn('⚠️ No sponsorshipId in metadata and not a treasury donation')
      }
      break

    case 'payment_intent.succeeded':
      console.log('💰 Payment succeeded:', event.data.object.id)
      break

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object as any
      console.log('❌ Payment failed:', {
        intentId: failedIntent.id,
        amount: failedIntent.amount,
        currency: failedIntent.currency,
        lastError: failedIntent.last_payment_error
      })
      break

    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`)
  }

  console.log('✅ Webhook response sent')
  return NextResponse.json({ received: true })
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false
  }
}