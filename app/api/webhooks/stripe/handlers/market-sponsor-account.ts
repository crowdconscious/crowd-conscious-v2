import Stripe from 'stripe'
import { getSupabase } from '../lib/stripe-webhook-utils'
import { sendSponsorConfirmationEmail, sendSponsorshipAdminNotification } from '@/lib/resend'
import { calculateFundAllocationRounded, normalizeSponsorTierId, TIER_DURATION_MONTHS } from '@/lib/sponsor-tiers'

/**
 * Dashboard flow: sponsor a platform market with an existing sponsor account (Market Sponsor tier).
 */
export async function handleMarketSponsorAccount(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {}
  if (metadata.product_type !== 'market_sponsor') return

  const marketId = metadata.market_id as string | undefined
  const sponsorAccountId = metadata.sponsor_account_id as string | undefined
  const tierId = normalizeSponsorTierId((metadata.tier as string) || 'starter')

  if (!marketId || !sponsorAccountId) {
    console.error('market_sponsor: missing market_id or sponsor_account_id')
    throw new Error('market_sponsor: missing metadata')
  }

  const amountTotal = session.amount_total ?? 0
  const amountMXN = amountTotal / 100

  const supabase = getSupabase()

  const { data: account, error: accErr } = await (supabase as any)
    .from('sponsor_accounts')
    .select('id, company_name, contact_email, logo_url, access_token, total_spent, total_fund_contribution')
    .eq('id', sponsorAccountId)
    .maybeSingle()

  if (accErr || !account) {
    console.error('market_sponsor: account not found', accErr)
    throw new Error('market_sponsor: account not found')
  }

  const { data: market, error: mErr } = await (supabase as any)
    .from('prediction_markets')
    .select('id, title, sponsor_name')
    .eq('id', marketId)
    .maybeSingle()

  if (mErr || !market) {
    console.error('market_sponsor: market not found', mErr)
    throw new Error('market_sponsor: market not found')
  }

  if (market.sponsor_name && String(market.sponsor_name).trim()) {
    console.warn('market_sponsor: market already sponsored', marketId)
    return
  }

  const alloc = calculateFundAllocationRounded(amountMXN, tierId)
  const fundAmount = alloc.fundAmountRounded
  const platformAmount = alloc.platformAmountRounded
  const fundPctLabel = Math.round(alloc.fundPercent * 100)

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
      sponsor_name: account.company_name as string,
      sponsor_email: account.contact_email as string,
      sponsor_url: null,
      sponsor_logo_url: account.logo_url ?? null,
      market_id: marketId,
      category: null,
      fund_amount: fundAmount,
      platform_amount: platformAmount,
      report_token: reportToken,
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
    })
    .select('id')
    .single()

  if (sponsorError) {
    console.error('market_sponsor: sponsorship insert failed', sponsorError)
    throw new Error(sponsorError.message)
  }

  const sponsorshipId = sponsorship?.id

  await (supabase as any)
    .from('sponsorship_log')
    .upsert(
      {
        stripe_session_id: session.id,
        sponsorship_id: sponsorshipId,
        sponsor_name: account.company_name,
        is_anonymous: false,
        sponsor_tier: tierId,
        amount_paid: amountMXN,
        stripe_fee: alloc.stripeFeeRounded,
        net_amount: alloc.netAmountRounded,
        fund_allocation: fundAmount,
        fund_percent: alloc.fundPercent,
        platform_revenue: platformAmount,
        market_id: marketId,
        cause_id: null,
        paid_at: new Date().toISOString(),
        is_public: true,
      },
      { onConflict: 'stripe_session_id' }
    )

  const { error: fundTxError } = await (supabase as any)
    .from('conscious_fund_transactions')
    .insert({
      amount: fundAmount,
      source_type: 'sponsorship' as const,
      source_id: sponsorshipId,
      market_id: marketId,
      description: `Market sponsor (dashboard) — ${account.company_name} — ~${fundPctLabel}% (est. net). Session: ${session.id}`,
    })

  if (fundTxError) {
    console.error('market_sponsor: fund tx failed', fundTxError)
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

  await (supabase as any)
    .from('sponsor_accounts')
    .update({
      total_spent: Number(account.total_spent ?? 0) + amountMXN,
      total_fund_contribution: Number(account.total_fund_contribution ?? 0) + fundAmount,
    })
    .eq('id', sponsorAccountId)

  const sponsorPayload = {
    sponsor_id: sponsorshipId,
    sponsor_name: account.company_name as string,
    sponsor_logo_url: account.logo_url ?? null,
    sponsor_url: null,
    sponsor_contribution: amountMXN,
    sponsor_type: 'business' as const,
    sponsor_account_id: sponsorAccountId,
    updated_at: new Date().toISOString(),
  }

  const { error: marketError } = await (supabase as any)
    .from('prediction_markets')
    .update(sponsorPayload)
    .eq('id', marketId)

  if (marketError) {
    console.error('market_sponsor: market update failed', marketError)
  }

  if (account.contact_email) {
    await sendSponsorConfirmationEmail(
      account.contact_email as string,
      account.company_name as string,
      tierId,
      amountMXN,
      market.title as string,
      undefined,
      marketId,
      sponsorshipId,
      reportToken,
      account.access_token as string
    )
  }

  await sendSponsorshipAdminNotification({
    sponsorName: account.company_name as string,
    sponsorEmail: account.contact_email as string,
    sponsorUrl: '',
    tier: tierId,
    amountMXN,
    fundAmount,
    platformAmount,
    fundPercent: alloc.fundPercent,
    marketTitle: market.title as string,
    marketId,
  })

  console.log('market_sponsor completed:', { sessionId: session.id, marketId, sponsorAccountId })
}
