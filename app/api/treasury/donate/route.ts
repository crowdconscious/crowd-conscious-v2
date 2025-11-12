import { NextRequest } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'
import Stripe from 'stripe'
import { moderateRateLimit, getRateLimitIdentifier, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

function getStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-08-27.basil',
  })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    // Rate limiting: 10 requests per minute for donations (moderate)
    const identifier = await getRateLimitIdentifier(request, user.id)
    const rateLimitResult = await checkRateLimit(moderateRateLimit, identifier)
    if (rateLimitResult && !rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.reset)
    }

    const stripe = getStripeClient()

    const body = await request.json()
    const { communityId, amount, communityName } = body

    if (!communityId || !amount || amount <= 0) {
      return ApiResponse.badRequest('Community ID and valid amount are required', 'MISSING_REQUIRED_FIELDS')
    }

    const supabase = await createServerAuth()

    // Check if user is a community member
    const { data: membership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', (user as any).id)
      .single()

    if (!membership) {
      return ApiResponse.forbidden('You must be a community member to donate to the pool', 'NOT_COMMUNITY_MEMBER')
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', (user as any).id)
      .single()

    // Create Stripe checkout session for donation
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Community Pool Donation`,
              description: `Donation to ${communityName} community treasury`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/communities/${communityId}?donation_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/communities/${communityId}?donation_cancelled=true`,
      customer_email: profile?.email,
      metadata: {
        type: 'treasury_donation',
        community_id: communityId,
        donor_id: (user as any).id,
        donor_email: profile?.email || '',
        donor_name: profile?.full_name || '',
        amount: amount.toString(),
      },
    })

    return ApiResponse.ok({ url: session.url })
  } catch (error: any) {
    console.error('Treasury donation error:', error)
    return ApiResponse.serverError('Failed to create donation', 'TREASURY_DONATION_ERROR', { message: error.message })
  }
}

