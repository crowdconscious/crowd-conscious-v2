import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse } from '@/lib/api-responses'

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return ApiResponse.badRequest('Missing session_id', 'MISSING_SESSION_ID')
    }

    // Retrieve session from Stripe
    const stripeClient = getStripe()
    const session = await stripeClient.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return ApiResponse.badRequest('Payment not completed', 'PAYMENT_NOT_COMPLETED')
    }

    // Get sponsorship details
    const sponsorshipId = session.metadata?.sponsorshipId

    if (!sponsorshipId) {
      return ApiResponse.notFound('Sponsorship', 'SPONSORSHIP_NOT_FOUND')
    }

    const supabaseClient = getSupabase()
    const { data: sponsorship, error } = await supabaseClient
      .from('sponsorships')
      .select('*')
      .eq('id', sponsorshipId)
      .single()

    if (error || !sponsorship) {
      return ApiResponse.notFound('Sponsorship', 'SPONSORSHIP_NOT_FOUND')
    }

    return ApiResponse.ok({
      sponsorship
    })
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return ApiResponse.serverError('Payment verification failed', 'PAYMENT_VERIFICATION_ERROR', { message: error.message })
  }
}
