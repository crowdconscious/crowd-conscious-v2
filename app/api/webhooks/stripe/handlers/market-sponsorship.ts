import Stripe from 'stripe'
import { getSupabase } from '../lib/stripe-webhook-utils'
import { sendSponsorConfirmationEmail, sendSponsorshipAdminNotification } from '@/lib/resend'
import { CONSCIOUS_FUND_PERCENT, PLATFORM_RETENTION_PERCENT } from '@/lib/fund-allocation'

const TIER_DURATION_MONTHS: Record<string, number> = {
  market: 3,
  category: 6,
  impact: 12,
  patron: 12,
}

/**
 * Handle market sponsorship payment after successful checkout.
 * Creates sponsorship record, updates markets, allocates fund, sends emails.
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
  const amountMXN = amountTotal / 100
  const fundAmount = Math.round(amountMXN * CONSCIOUS_FUND_PERCENT)
  const platformAmount = Math.round(amountMXN * PLATFORM_RETENTION_PERCENT)

  const supabase = getSupabase()
  const tierKey = (tier as string) || 'market'
  const months = TIER_DURATION_MONTHS[tierKey] ?? 3
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + months)

  const reportToken = crypto.randomUUID()

  // 1. Create sponsorship record
  const { data: sponsorship, error: sponsorError } = await (supabase as any)
    .from('sponsorships')
    .insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string | null,
      amount_mxn: amountMXN,
      tier: tierKey,
      status: 'active',
      sponsor_name: sponsor_name || 'Sponsor',
      sponsor_email: sponsor_email || '',
      sponsor_url: sponsor_url || null,
      sponsor_logo_url: sponsor_logo_url || null,
      market_id: market_id || null,
      category: category || null,
      fund_amount: fundAmount,
      platform_amount: platformAmount,
      report_token: reportToken,
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
    })
    .select('id')
    .single()

  if (sponsorError) {
    console.error('Market sponsorship: failed to create sponsorship record', sponsorError)
    throw new Error(`Sponsorship insert failed: ${sponsorError.message}`)
  }

  const sponsorshipId = sponsorship?.id

  // 2. Insert fund transaction
  const { error: fundTxError } = await (supabase as any)
    .from('conscious_fund_transactions')
    .insert({
      amount: fundAmount,
      source_type: 'sponsorship' as const,
      source_id: sponsorshipId,
      market_id: market_id || null,
      description: `Sponsorship from ${sponsor_name} (${tierKey}) - 40% to Conscious Fund. Session: ${session.id}`,
    })

  if (fundTxError) {
    console.error('Market sponsorship: failed to insert fund transaction', fundTxError)
  }

  // 3. Update conscious_fund totals
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

  const sponsorPayload = {
    sponsor_id: sponsorshipId,
    sponsor_name: sponsor_name || 'Sponsor',
    sponsor_logo_url: sponsor_logo_url || null,
    sponsor_url: sponsor_url || null,
    sponsor_contribution: amountMXN,
    sponsor_type: 'business' as const,
    updated_at: new Date().toISOString(),
  }

  // 4. Update prediction_markets
  if (market_id && sponsor_name) {
    const { error: marketError } = await (supabase as any)
      .from('prediction_markets')
      .update(sponsorPayload)
      .eq('id', market_id)

    if (marketError) {
      console.error('Market sponsorship: failed to update market', marketError)
    }
  }

  // 5. Category tier: update ALL active markets in that category
  if (tierKey === 'category' && category && sponsor_name) {
    const { error: categoryError } = await (supabase as any)
      .from('prediction_markets')
      .update(sponsorPayload)
      .eq('category', category)
      .in('status', ['active', 'trading', 'approved'])

    if (categoryError) {
      console.error('Market sponsorship: failed to update category markets', categoryError)
    }
  }

  // 6. Send sponsor confirmation email
  let marketTitle: string | undefined
  if (market_id) {
    const { data: market } = await (supabase as any)
      .from('prediction_markets')
      .select('title')
      .eq('id', market_id)
      .single()
    marketTitle = market?.title
  }

  if (sponsor_email) {
    await sendSponsorConfirmationEmail(
      sponsor_email,
      sponsor_name || 'Sponsor',
      tierKey,
      amountMXN,
      marketTitle,
      category || undefined,
      market_id || undefined,
      sponsorshipId,
      reportToken
    )
  }

  // 7. Send admin notification
  await sendSponsorshipAdminNotification({
    sponsorName: sponsor_name || 'Sponsor',
    sponsorEmail: sponsor_email || '',
    sponsorUrl: sponsor_url || '',
    tier: tierKey,
    amountMXN,
    fundAmount,
    platformAmount,
    marketId: market_id || undefined,
    marketTitle,
    category: category || undefined,
  })

  console.log('Market sponsorship completed:', {
    sessionId: session.id,
    sponsorshipId,
    sponsor_name,
    tier: tierKey,
    market_id: market_id || 'category',
    category: category || null,
    amountMXN,
    fundAmount,
  })
}
