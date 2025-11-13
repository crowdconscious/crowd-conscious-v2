import Stripe from 'stripe'
import { getStripe, getSupabase } from '../lib/stripe-webhook-utils'
import { awardXP } from '@/lib/xp-system'
import { checkAndUnlockAchievements } from '@/lib/achievement-service'

/**
 * Handle sponsorship payment after successful checkout
 */
export async function handleSponsorship(session: Stripe.Checkout.Session) {
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

  if (!sponsorshipId) {
    console.warn('⚠️ No sponsorshipId in metadata')
    return
  }

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
    throw new Error(`Failed to update sponsorship: ${error.message}`)
  }

  console.log('✅ Sponsorship updated successfully:', sponsorshipId)

  // ✅ GAMIFICATION: Award XP and check achievements for sponsorship
  try {
    // Get sponsor user ID from sponsorship record
    const { data: sponsorship, error: sponsorError } = await (supabaseClient as any)
      .from('sponsorships')
      .select('sponsor_id, content_id, community_content(title)')
      .eq('id', sponsorshipId)
      .single()

    if (!sponsorError && sponsorship?.sponsor_id) {
      // Award XP for sponsorship
      const xpResult = await awardXP(
        sponsorship.sponsor_id,
        'sponsor_need',
        sponsorshipId,
        `Sponsored: ${sponsorship.community_content?.title || 'community need'}`
      )

      // Check for achievements
      const achievements = await checkAndUnlockAchievements(
        sponsorship.sponsor_id,
        'sponsor_need',
        sponsorshipId
      )

      console.log('✅ XP awarded for sponsorship:', {
        sponsor_id: sponsorship.sponsor_id,
        xp_amount: xpResult.xp_amount,
        total_xp: xpResult.total_xp,
        tier_changed: xpResult.tier_changed,
        achievements_unlocked: achievements.length
      })
    }
  } catch (xpError: any) {
    // Log but don't fail webhook if XP award fails
    console.error('⚠️ Error awarding XP for sponsorship (non-fatal):', xpError)
  }

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

  // TODO: Send confirmation email
  // await sendSponsorshipConfirmationEmail(...)

  console.log('🎉 Sponsorship webhook processing completed successfully')
}

