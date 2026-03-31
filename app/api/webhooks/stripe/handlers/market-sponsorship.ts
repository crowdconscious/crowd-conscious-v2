import Stripe from 'stripe'
import { getSupabase } from '../lib/stripe-webhook-utils'
import { sendSponsorConfirmationEmail, sendSponsorshipAdminNotification } from '@/lib/resend'
import {
  normalizeSponsorTierId,
  calculateFundAllocationRounded,
  TIER_DURATION_MONTHS,
} from '@/lib/sponsor-tiers'

type SponsorAccountRow = {
  id: string
  access_token: string
  total_spent: number | null
  total_fund_contribution: number | null
  is_pulse_client: boolean | null
}

async function recordStripeCouponRedemption(
  supabase: ReturnType<typeof getSupabase>,
  params: {
    couponId: string
    email: string
    sponsorName: string | null
    sponsorAccountId: string | null
  }
) {
  const email = params.email.trim().toLowerCase()
  if (!email) return

  const { data: coupon, error: fetchErr } = await (supabase as any)
    .from('coupon_codes')
    .select('id, current_uses, max_uses')
    .eq('id', params.couponId)
    .maybeSingle()

  if (fetchErr || !coupon) {
    console.error('Market sponsorship: coupon not found for redemption', fetchErr)
    return
  }

  const c = coupon as { id: string; current_uses: number; max_uses: number }

  const { error: insErr } = await (supabase as any).from('coupon_redemptions').insert({
    coupon_id: params.couponId,
    redeemed_by_email: email,
    redeemed_by_name: params.sponsorName,
    sponsor_account_id: params.sponsorAccountId,
  })

  if (insErr) {
    const code = (insErr as { code?: string }).code
    if (code === '23505') {
      return
    }
    console.error('Market sponsorship: coupon redemption insert failed', insErr)
    return
  }

  const { data: bumped, error: bumpErr } = await (supabase as any)
    .from('coupon_codes')
    .update({ current_uses: c.current_uses + 1 })
    .eq('id', c.id)
    .eq('current_uses', c.current_uses)
    .lt('current_uses', c.max_uses)
    .select('id')
    .maybeSingle()

  if (bumpErr || !bumped) {
    console.error('Market sponsorship: coupon current_uses bump failed', bumpErr)
  }
}

async function upsertSponsorAccount(
  supabase: ReturnType<typeof getSupabase>,
  params: {
    email: string
    sponsorName: string
    sponsorLogoUrl: string | null
    tierId: string
    amountMXN: number
    fundAmount: number
    isPulse: boolean
    stripeCustomerId: string | null
    contactName: string | null
  }
): Promise<{ id: string; access_token: string } | null> {
  const email = params.email.trim().toLowerCase()
  if (!email) return null

  const { data: existing } = (await (supabase as any)
    .from('sponsor_accounts')
    .select('id, access_token, total_spent, total_fund_contribution, is_pulse_client')
    .eq('contact_email', email)
    .maybeSingle()) as { data: SponsorAccountRow | null }

  if (existing) {
    const patch = {
      total_spent: Number(existing.total_spent ?? 0) + params.amountMXN,
      total_fund_contribution:
        Number(existing.total_fund_contribution ?? 0) + params.fundAmount,
      company_name: params.sponsorName,
      tier: params.tierId,
      is_pulse_client: params.isPulse || !!existing.is_pulse_client,
      ...(params.sponsorLogoUrl ? { logo_url: params.sponsorLogoUrl } : {}),
      ...(params.stripeCustomerId ? { stripe_customer_id: params.stripeCustomerId } : {}),
    }

    const { error: updErr } = await (supabase as any)
      .from('sponsor_accounts')
      .update(patch)
      .eq('id', existing.id)

    if (updErr) {
      console.error('Market sponsorship: sponsor_accounts update failed', updErr)
    }
    return { id: existing.id, access_token: existing.access_token }
  }

  const { data: created, error } = await (supabase as any)
    .from('sponsor_accounts')
    .insert({
      company_name: params.sponsorName,
      contact_email: email,
      contact_name: params.contactName,
      logo_url: params.sponsorLogoUrl,
      tier: params.tierId,
      stripe_customer_id: params.stripeCustomerId,
      total_spent: params.amountMXN,
      total_fund_contribution: params.fundAmount,
      is_pulse_client: params.isPulse,
    })
    .select('id, access_token')
    .single()

  if (error || !created) {
    console.error('Market sponsorship: sponsor_accounts insert failed', error)
    return null
  }

  return { id: created.id, access_token: created.access_token }
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
    is_pulse,
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

  const contactEmail =
    (sponsor_email || session.customer_details?.email || '').trim().toLowerCase()
  const isPulseMarket = is_pulse === 'true'
  const stripeCustomerId =
    typeof session.customer === 'string' && session.customer ? session.customer : null

  const sponsorAccount = await upsertSponsorAccount(supabase, {
    email: contactEmail,
    sponsorName: sponsor_name || 'Sponsor',
    sponsorLogoUrl: sponsor_logo_url || null,
    tierId,
    amountMXN,
    fundAmount,
    isPulse: isPulseMarket,
    stripeCustomerId,
    contactName: session.customer_details?.name ?? null,
  })

  const couponId = metadata.coupon_id
  if (couponId && contactEmail) {
    await recordStripeCouponRedemption(supabase, {
      couponId,
      email: contactEmail,
      sponsorName: (sponsor_name as string | undefined) || null,
      sponsorAccountId: sponsorAccount?.id ?? null,
    })
  }

  const sponsorPayload = {
    sponsor_id: sponsorshipId,
    sponsor_name: sponsor_name || 'Sponsor',
    sponsor_logo_url: sponsor_logo_url || null,
    sponsor_url: sponsor_url || null,
    sponsor_contribution: amountMXN,
    sponsor_type: 'business' as const,
    ...(sponsorAccount ? { sponsor_account_id: sponsorAccount.id } : {}),
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
      reportToken,
      sponsorAccount?.access_token
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
