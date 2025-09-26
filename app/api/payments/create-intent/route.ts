import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { createSponsorshipPaymentIntent } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sponsorshipId, amount } = await request.json()

    if (!sponsorshipId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
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
      .eq('sponsor_id', user.id)
      .single()

    if (sponsorshipError || !sponsorship) {
      return NextResponse.json({ error: 'Sponsorship not found' }, { status: 404 })
    }

    if (sponsorship.status !== 'approved') {
      return NextResponse.json({ error: 'Sponsorship not approved yet' }, { status: 400 })
    }

    // Verify the amount matches the sponsorship
    if (Math.abs(sponsorship.amount - amount) > 0.01) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // Create Stripe payment intent
    const paymentData = await createSponsorshipPaymentIntent(
      amount,
      sponsorship.id,
      user.id,
      sponsorship.community_content.community_id,
      sponsorship.content_id
    )

    // Update sponsorship with payment intent
    const { error: updateError } = await supabase
      .from('sponsorships')
      .update({
        stripe_payment_intent: paymentData.paymentIntentId,
        platform_fee: paymentData.platformFee / 100, // Convert back to dollars
        status: 'payment_pending'
      })
      .eq('id', sponsorship.id)

    if (updateError) {
      console.error('Error updating sponsorship:', updateError)
      return NextResponse.json({ error: 'Failed to update sponsorship' }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret: paymentData.clientSecret,
      paymentIntentId: paymentData.paymentIntentId,
      amount: paymentData.amount,
      platformFee: paymentData.platformFee,
      netAmount: paymentData.netAmount
    })

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
