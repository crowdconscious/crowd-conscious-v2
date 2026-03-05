import Stripe from 'stripe'
import { getSupabase } from '../lib/stripe-webhook-utils'

/**
 * Handle market sponsorship payment after successful checkout
 * Updates prediction_markets with sponsor info, adds 15% to Conscious Fund
 */
export async function handleMarketSponsorship(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {}
  const {
    type,
    tier,
    market_id,
    category,
    sponsor_name,
    sponsor_url,
    sponsor_logo_url,
    sponsor_email,
  } = metadata

  if (type !== 'market_sponsorship') return

  const amountTotal = session.amount_total ?? 0
  const amountMXN = amountTotal / 100 // Stripe amounts are in centavos
  const fundAmount = Math.round(amountMXN * 0.15) // 15% to Conscious Fund

  const supabase = getSupabase()

  // 1. Insert fund transaction (15% of sponsorship)
  const { error: fundTxError } = await (supabase as any)
    .from('conscious_fund_transactions')
    .insert({
      amount: fundAmount,
      source_type: 'sponsorship' as const,
      source_id: null,
      market_id: market_id || null,
      description: `Sponsorship from ${sponsor_name} (${tier}) - 15% to Conscious Fund. Session: ${session.id}`,
    })

  if (fundTxError) {
    console.error('Market sponsorship: failed to insert fund transaction', fundTxError)
  }

  // 2. Update conscious_fund totals (add 15% to fund)
  const { data: fundRow } = await (supabase as any)
    .from('conscious_fund')
    .select('id, total_collected, current_balance')
    .limit(1)
    .single()

  if (fundRow) {
    await (supabase as any)
      .from('conscious_fund')
      .update({
        total_collected: Number(fundRow.total_collected) + fundAmount,
        current_balance: Number(fundRow.current_balance) + fundAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fundRow.id)
  }

  // 2. If market_id provided, update that market's sponsor fields
  if (market_id && sponsor_name) {
    const { error: marketError } = await (supabase as any)
      .from('prediction_markets')
      .update({
        sponsor_name,
        sponsor_logo_url: sponsor_logo_url || null,
        sponsor_url: sponsor_url || null,
        sponsor_contribution: amountMXN,
        sponsor_type: 'business',
        updated_at: new Date().toISOString(),
      })
      .eq('id', market_id)

    if (marketError) {
      console.error('Market sponsorship: failed to update market', marketError)
    }
  }

  // 3. TODO: Send confirmation email via Resend (when configured)
  console.log('Market sponsorship completed:', {
    sessionId: session.id,
    sponsor_name,
    tier,
    market_id: market_id || 'category/manual',
    amountMXN,
    fundAmount,
  })
}
