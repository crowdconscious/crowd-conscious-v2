import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createServerAuth } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse } from '@/lib/api-responses'

// Initialize Stripe lazily
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

// Initialize Supabase admin client
function getSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are not set')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/**
 * POST /api/stripe/connect/onboard
 * 
 * Creates a Stripe Connect account for a community founder
 * and returns an onboarding link
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Starting Stripe Connect onboarding...')
    
    // Get authenticated user
    const supabaseAuth = await createServerAuth()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return ApiResponse.unauthorized('Please log in to access Stripe Connect', 'AUTHENTICATION_REQUIRED')
    }
    
    console.log('✅ User authenticated:', user.id)
    
    // Get user profile
    const supabase = getSupabase()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_id, email, full_name')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Failed to fetch profile:', profileError)
      return ApiResponse.serverError('Failed to fetch user profile', 'PROFILE_FETCH_ERROR', { message: profileError.message })
    }
    
    const stripeClient = getStripe()
    let accountId = profile.stripe_connect_id
    
    // Create Connect account if doesn't exist
    if (!accountId) {
      console.log('📝 Creating new Stripe Connect account...')
      
      const account = await stripeClient.accounts.create({
        type: 'express',
        country: 'MX', // Mexico
        email: profile.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual', // Can be changed to 'company' if needed
        metadata: {
          user_id: user.id,
          platform: 'crowd_conscious'
        }
      })
      
      accountId = account.id
      console.log('✅ Stripe Connect account created:', accountId)
      
      // Save to database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_connect_id: accountId })
        .eq('id', user.id)
      
      if (updateError) {
        console.error('❌ Failed to save Connect ID:', updateError)
        // Continue anyway - account is created
      } else {
        console.log('✅ Stripe Connect ID saved to database')
      }
    } else {
      console.log('✅ Using existing Stripe Connect account:', accountId)
    }
    
    // Create onboarding link
    console.log('🔗 Creating onboarding link...')
    const accountLink = await stripeClient.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments/success`,
      type: 'account_onboarding',
    })
    
    console.log('✅ Onboarding link created:', accountLink.url)
    
    return ApiResponse.ok({ 
      url: accountLink.url,
      accountId: accountId
    })
    
  } catch (error: any) {
    console.error('💥 Stripe Connect onboarding error:', error)
    return ApiResponse.serverError('Failed to create onboarding link', 'STRIPE_CONNECT_ONBOARD_ERROR', { message: error.message })
  }
}

/**
 * GET /api/stripe/connect/onboard
 * 
 * Check onboarding status of current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabaseAuth = await createServerAuth()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return ApiResponse.unauthorized('Please log in to check onboarding status', 'AUTHENTICATION_REQUIRED')
    }
    
    // Get user profile
    const supabase = getSupabase()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_connect_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile.stripe_connect_id) {
      return ApiResponse.ok({
        onboarded: false,
        charges_enabled: false,
        payouts_enabled: false
      })
    }
    
    // Check account status with Stripe
    const stripeClient = getStripe()
    const account = await stripeClient.accounts.retrieve(profile.stripe_connect_id)
    
    const chargesEnabled = account.charges_enabled || false
    const payoutsEnabled = account.payouts_enabled || false
    const onboardingComplete = chargesEnabled && payoutsEnabled
    
    // Update database if status changed
    if (
      onboardingComplete !== profile.stripe_onboarding_complete ||
      chargesEnabled !== profile.stripe_charges_enabled ||
      payoutsEnabled !== profile.stripe_payouts_enabled
    ) {
      await supabase
        .from('profiles')
        .update({
          stripe_onboarding_complete: onboardingComplete,
          stripe_charges_enabled: chargesEnabled,
          stripe_payouts_enabled: payoutsEnabled
        })
        .eq('id', user.id)
    }
    
    return ApiResponse.ok({
      onboarded: onboardingComplete,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      account_id: profile.stripe_connect_id
    })
    
  } catch (error: any) {
    console.error('Error checking onboarding status:', error)
    return ApiResponse.serverError('Failed to check onboarding status', 'ONBOARDING_STATUS_ERROR', { message: error.message })
  }
}

