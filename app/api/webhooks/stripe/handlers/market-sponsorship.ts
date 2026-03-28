import Stripe from 'stripe'
import { getSupabase } from '../lib/stripe-webhook-utils'
import { sendSponsorConfirmationEmail, sendSponsorshipAdminNotification } from '@/lib/resend'
import {
  normalizeSponsorTierId,
  calculateFundAllocationRounded,
  TIER_DURATION_MONTHS,
} from '@/lib/sponsor-tiers'

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

  const tierId = normalizeSponsorTierId(tier)
  const alloc = calculateFundAllocationRounded(amountMXN, tierId)
  const fundAmount = alloc.fundAmountRounded
  const platformAmount = alloc.platformAmountRounded
  const fundPctLabel = Math.round(alloc.fundPercent * 100)

  const supabase = getSupabase()
  const months = TIER_DURATION_MONTHS[tierId] ?? 3
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + months)

  const reportToken = crypto.randomUUID()

  const { data: sponsorship, error: sponsorError } = await (supabase as any)
    .from('sponsorships')
    .insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string | null,
      amount_mxn: amountMXN,
      tier: tierId,
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

  const isAnonymous =
    metadata.sponsor_anonymous === 'true' ||
    metadata.anonymous === 'true' ||
    metadata.hide_sponsor_name === 'true'

  const { error: sponsorshipLogError } = await (supabase as any)
    .from('sponsorship_log')
    .upsert(
      {
        stripe_session_id: session.id,
        sponsorship_id: sponsorshipId,
        sponsor_name: sponsor_name || 'Sponsor',
        is_anonymous: isAnonymous,
        sponsor_tier: tierId,
        amount_paid: amountMXN,
        stripe_fee: alloc.stripeFeeRounded,
        net_amount: alloc.netAmountRounded,
        fund_allocation: fundAmount,
        fund_percent: alloc.fundPercent,
        platform_revenue: platformAmount,
        market_id: market_id || null,
        cause_id: null,
        paid_at: new Date().toISOString(),
        is_public: true,
      },
      { onConflict: 'stripe_session_id' }
    )

  if (sponsorshipLogError) {
    console.error('Market sponsorship: sponsorship_log upsert failed', sponsorshipLogError)
  }

  const { error: fundTxError } = await (supabase as any)
    .from('conscious_fund_transactions')
    .insert({
      amount: fundAmount,
      source_type: 'sponsorship' as const,
      source_id: sponsorshipId,
      market_id: market_id || null,
      description: `Sponsorship from ${sponsor_name} (${tierId}) — ${fundPctLabel}% (est. net) to Conscious Fund. Session: ${session.id}`,
    })

  if (fundTxError) {
    console.error('Market sponsorship: failed to insert fund transaction', fundTxError)
  }

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

  if (market_id && sponsor_name) {
    const { error: marketError } = await (supabase as any)
      .from('prediction_markets')
      .update(sponsorPayload)
      .eq('id', market_id)

    if (marketError) {
      console.error('Market sponsorship: failed to update market', marketError)
    }
  }

  // Category tier: update ALL active markets in that category
  if (tierId === 'growth' && category && sponsor_name) {
    const { error: categoryError } = await (supabase as any)
      .from('prediction_markets')
      .update(sponsorPayload)
      .eq('category', category)
      .in('status', ['active', 'trading', 'approved'])

    if (categoryError) {
      console.error('Market sponsorship: failed to update category markets', categoryError)
    }
  }

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
      tierId,
      amountMXN,
      marketTitle,
      category || undefined,
      market_id || undefined,
      sponsorshipId,
      reportToken
    )
  }

  await sendSponsorshipAdminNotification({
    sponsorName: sponsor_name || 'Sponsor',
    sponsorEmail: sponsor_email || '',
    sponsorUrl: sponsor_url || '',
    tier: tierId,
    amountMXN,
    fundAmount,
    platformAmount,
    fundPercent: alloc.fundPercent,
    marketId: market_id || undefined,
    marketTitle,
    category: category || undefined,
  })

  console.log('Market sponsorship completed:', {
    sessionId: session.id,
    sponsorshipId,
    sponsor_name,
    tier: tierId,
    market_id: market_id || 'category',
    category: category || null,
    amountMXN,
    fundAmount,
  })
}
