import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { ApiResponse } from '@/lib/api-responses'
import { strictRateLimit, getRateLimitIdentifier, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth-server'

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

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests per minute for checkout (strict)
    const user = await getCurrentUser()
    const identifier = await getRateLimitIdentifier(request, user?.id)
    const rateLimitResult = await checkRateLimit(strictRateLimit, identifier)
    if (rateLimitResult && !rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.reset)
    }
    // Debug logging
    console.log('🔍 Environment check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      nodeEnv: process.env.NODE_ENV
    })

    const {
      sponsorshipId,
      amount,
      contentTitle,
      communityName,
      communityId,
      sponsorType,
      brandName,
      email,
      taxReceipt,
      coverPlatformFee = false // NEW: Whether sponsor covers platform fee
    } = await request.json()

    // Validate required fields
    if (!sponsorshipId || !amount || !email) {
      return ApiResponse.badRequest('Missing required fields', 'MISSING_REQUIRED_FIELDS')
    }

    const stripeClient = getStripe()
    
    // Calculate amounts based on whether sponsor covers platform fee
    let totalChargeAmount: number // What the sponsor pays (in cents)
    let platformFeeAmount: number // Platform's cut (in cents)
    let founderAmount: number // What creator receives (in cents)
    
    if (coverPlatformFee) {
      // Sponsor covers the fee: They pay 115%, creator gets 100%
      totalChargeAmount = Math.round(amount * 1.15 * 100) // Sponsor pays 115%
      platformFeeAmount = Math.round(amount * 0.15 * 100) // Platform gets 15% of original
      founderAmount = amount * 100 // Creator gets 100% of original amount
    } else {
      // Standard split: They pay 100%, creator gets 85%
      totalChargeAmount = amount * 100 // Sponsor pays 100%
      platformFeeAmount = Math.round(amount * 0.15 * 100) // Platform gets 15%
      founderAmount = totalChargeAmount - platformFeeAmount // Creator gets 85%
    }
    
    console.log('💰 Payment split:', {
      coverPlatformFee,
      totalChargeAmount,
      platformFee: platformFeeAmount,
      founderAmount: founderAmount,
      sponsorshipAmount: amount * 100
    })

    // Get community founder's Stripe Connect account (if exists)
    let connectedAccountId: string | null = null
    if (communityId) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        const { data: community } = await supabase
          .from('communities')
          .select('stripe_account_id, created_by, profiles!communities_created_by_fkey(stripe_connect_id, stripe_onboarding_complete)')
          .eq('id', communityId)
          .single()
        
        const founderProfile: any = (community as any)?.profiles
        if (founderProfile?.stripe_connect_id && founderProfile?.stripe_onboarding_complete) {
          connectedAccountId = founderProfile.stripe_connect_id
          console.log('✅ Found connected account for founder:', connectedAccountId)
        } else {
          console.log('⚠️ Founder has not completed Stripe Connect onboarding')
        }
      } catch (error) {
        console.error('⚠️ Error fetching community Stripe account:', error)
        // Continue without Connect - platform gets full amount
      }
    }

    // Create checkout session with or without Connect
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Sponsorship: ${contentTitle}`,
              description: coverPlatformFee 
                ? `Support for ${communityName} (+ platform fee covered)` 
                : `Support for ${communityName}`,
              images: ['https://crowdconscious.app/images/logo.png']
            },
            unit_amount: totalChargeAmount // Charge the calculated total
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsorship/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsorship/cancelled`,
      customer_email: email,
      metadata: {
        sponsorshipId,
        sponsorType,
        brandName: brandName || '',
        taxReceipt: taxReceipt ? 'yes' : 'no',
        contentTitle,
        communityName,
        communityId: communityId || '',
        platformFeeAmount: (platformFeeAmount / 100).toString(),
        founderAmount: (founderAmount / 100).toString(),
        connectedAccountId: connectedAccountId || '',
        coverPlatformFee: coverPlatformFee ? 'yes' : 'no', // Track if fee was covered
        originalSponsorshipAmount: amount.toString() // Original amount before fee
      },
      // Enable tax ID collection for Mexican businesses
      ...(taxReceipt && {
        tax_id_collection: {
          enabled: true
        }
      })
    }

    // If founder has Connect account, use application fee
    if (connectedAccountId) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: connectedAccountId,
        },
      }
      console.log('✅ Using Stripe Connect with application fee')
    } else {
      console.log('⚠️ No Connect account - platform receives full amount')
    }

    const session = await stripeClient.checkout.sessions.create(sessionConfig)

    return ApiResponse.ok({ url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return ApiResponse.serverError('Failed to create checkout session', 'CHECKOUT_SESSION_ERROR', { message: error.message })
  }
}
