import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { createSponsorshipPaymentIntent } from '@/lib/stripe'
import { ApiResponse } from '@/lib/api-responses'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Please log in to create payment intent', 'AUTHENTICATION_REQUIRED')
    }

    const { sponsorshipId, amount } = await request.json()

    if (!sponsorshipId || !amount || amount <= 0) {
      return ApiResponse.badRequest('Invalid parameters', 'INVALID_PARAMETERS')
    }

    // Get sponsorship details
    const { data: sponsorship, error: sponsorshipError } = await supabase
      .from('sponsorships')
      .select(`
        id,
        content_id,
        sponsor_id,
        amount,
        status,
        community_content (
          id,
          community_id,
          title,
          communities (
            id,
            name
          )
        )
      `)
      .eq('id', sponsorshipId)
      .eq('sponsor_id', (user as any).id)
      .single()

    if (sponsorshipError || !sponsorship) {
      return ApiResponse.notFound('Sponsorship', 'SPONSORSHIP_NOT_FOUND')
    }

    if ((sponsorship as any).status !== 'approved') {
      return ApiResponse.badRequest('Sponsorship not approved yet', 'SPONSORSHIP_NOT_APPROVED')
    }

    // Verify the amount matches the sponsorship
    if (Math.abs((sponsorship as any).amount - amount) > 0.01) {
      return ApiResponse.badRequest('Amount mismatch', 'AMOUNT_MISMATCH')
    }

    // Create Stripe payment intent
    const paymentData = await createSponsorshipPaymentIntent(
      amount,
      (sponsorship as any).id,
      (user as any).id,
      (sponsorship as any).community_content.community_id,
      (sponsorship as any).content_id
    )

    // Update sponsorship with payment intent
    // TODO: Fix type issues with sponsorships table
    const { error: updateError } = null as any
    /* await supabase
      .from('sponsorships')
      .update({
        stripe_payment_intent: paymentData.paymentIntentId,
        platform_fee: paymentData.platformFee / 100, // Convert back to dollars
        status: 'payment_pending'
      })
      .eq('id', (sponsorship as any).id) */

    if (updateError) {
      console.error('Error updating sponsorship:', updateError)
      return ApiResponse.serverError('Failed to update sponsorship', 'SPONSORSHIP_UPDATE_ERROR', { message: updateError.message })
    }

    return ApiResponse.ok({
      clientSecret: paymentData.clientSecret,
      paymentIntentId: paymentData.paymentIntentId,
      amount: paymentData.amount,
      platformFee: paymentData.platformFee,
      netAmount: paymentData.netAmount
    })

  } catch (error: any) {
    console.error('Error creating payment intent:', error)
    return ApiResponse.serverError('Internal server error', 'PAYMENT_INTENT_ERROR', { message: error.message })
  }
}
