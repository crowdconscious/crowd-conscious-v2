import Stripe from 'stripe'
import { getSupabase } from '../lib/stripe-webhook-utils'

/**
 * Handle treasury donation after successful checkout
 */
export async function handleTreasuryDonation(session: Stripe.Checkout.Session) {
  console.log('💰 Processing treasury donation')
  
  if (!session.metadata) {
    console.warn('⚠️ No metadata found in session')
    return
  }

  const { community_id, donor_id, donor_email, donor_name, amount } = session.metadata

  if (!community_id || !amount) {
    console.warn('⚠️ Missing required metadata for treasury donation')
    return
  }

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
      throw new Error(`Failed to add treasury donation: ${error.message}`)
    }

    console.log('✅ Treasury donation added successfully:', data)
    console.log('🎉 Treasury webhook processing completed successfully')
  } catch (treasuryError: any) {
    console.error('❌ Treasury donation error:', treasuryError)
    throw new Error(`Treasury donation processing failed: ${treasuryError.message}`)
  }
}

