import Stripe from 'stripe'

/**
 * Handle sponsorship payment after successful checkout
 * Legacy: sponsorships table removed. Log and return without updating.
 */
export async function handleSponsorship(session: Stripe.Checkout.Session) {
  const { sponsorshipId } = session.metadata || {}

  if (sponsorshipId) {
    console.warn('⚠️ Sponsorship webhook received but sponsorships table was removed. Payment completed but no DB update.')
  }
}
