import Stripe from 'stripe'
import { getSupabase } from '../lib/stripe-webhook-utils'
import { sendSponsorConfirmationEmail, sendSponsorshipAdminNotification } from '@/lib/resend'
import {
  PULSE_TIERS,
  calculatePulseFundAllocationRounded,
  normalizePulseTierId,
  type PulseTierId,
} from '@/lib/pulse-tiers'
import { getPulseTierBenefits } from '@/lib/pulse-tier-benefits'

type SponsorAccountRow = {
  id: string
  access_token: string
  total_spent: number | null
  total_fund_contribution: number | null
  is_pulse_client: boolean | null
  pulse_subscription_active: boolean | null
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
    console.error('Pulse purchase: coupon not found for redemption', fetchErr)
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
    console.error('Pulse purchase: coupon redemption insert failed', insErr)
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
    console.error('Pulse purchase: coupon current_uses bump failed', bumpErr)
  }
}

async function upsertPulseSponsorAccount(
  supabase: ReturnType<typeof getSupabase>,
  params: {
    email: string
    companyName: string
    sponsorLogoUrl: string | null
    tierId: PulseTierId
    amountMXN: number
    fundAmount: number
    stripeCustomerId: string | null
    contactName: string | null
  }
): Promise<{ id: string; access_token: string } | null> {
  const email = params.email.trim().toLowerCase()
  if (!email) return null

  const subscriptionActive = params.tierId === 'suscripcion'
  const benefits = getPulseTierBenefits(params.tierId)

  const { data: existing } = (await (supabase as any)
    .from('sponsor_accounts')
    .select(
      'id, access_token, total_spent, total_fund_contribution, is_pulse_client, pulse_subscription_active'
    )
    .eq('contact_email', email)
    .maybeSingle()) as { data: SponsorAccountRow | null }

  if (existing) {
    const patch = {
      total_spent: Number(existing.total_spent ?? 0) + params.amountMXN,
      total_fund_contribution:
        Number(existing.total_fund_contribution ?? 0) + params.fundAmount,
      company_name: params.companyName,
      tier: params.tierId,
      is_pulse_client: true,
      pulse_subscription_active: subscriptionActive || existing.pulse_subscription_active === true,
      max_pulse_markets: benefits.max_pulse_markets,
      max_live_events: benefits.max_live_events,
      has_custom_branding: benefits.has_custom_branding,
      has_api_access: benefits.has_api_access,
      has_white_label: benefits.has_white_label,
      ...(params.sponsorLogoUrl ? { logo_url: params.sponsorLogoUrl } : {}),
      ...(params.stripeCustomerId ? { stripe_customer_id: params.stripeCustomerId } : {}),
    }

    const { error: updErr } = await (supabase as any)
      .from('sponsor_accounts')
      .update(patch)
      .eq('id', existing.id)

    if (updErr) {
      console.error('Pulse purchase: sponsor_accounts update failed', updErr)
    }
    return { id: existing.id, access_token: existing.access_token }
  }

  const { data: created, error } = await (supabase as any)
    .from('sponsor_accounts')
    .insert({
      company_name: params.companyName,
      contact_email: email,
      contact_name: params.contactName,
      logo_url: params.sponsorLogoUrl,
      tier: params.tierId,
      stripe_customer_id: params.stripeCustomerId,
      total_spent: params.amountMXN,
      total_fund_contribution: params.fundAmount,
      is_pulse_client: true,
      pulse_subscription_active: subscriptionActive,
      status: 'active',
      max_pulse_markets: benefits.max_pulse_markets,
      max_live_events: benefits.max_live_events,
      has_custom_branding: benefits.has_custom_branding,
      has_api_access: benefits.has_api_access,
      has_white_label: benefits.has_white_label,
      used_pulse_markets: 0,
      used_live_events: 0,
    })
    .select('id, access_token')
    .single()

  if (error || !created) {
    console.error('Pulse purchase: sponsor_accounts insert failed', error)
    return null
  }

  return { id: created.id, access_token: created.access_token }
}

/**
 * Conscious Pulse B2B checkout — creates sponsor account, fund allocation, optional coupon redemption.
 */
export async function handlePulsePurchase(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {}
  if (metadata.product_type !== 'pulse') return

  const tierId = normalizePulseTierId(metadata.tier as string)
  const companyName = (metadata.company_name as string) || 'Pulse client'
  const contactEmail = (
    (metadata.contact_email as string) ||
    session.customer_details?.email ||
    ''
  ).trim()
  const logoUrl = (metadata.logo_url as string) || null
  const couponId = (metadata.coupon_id as string) || ''

  const amountTotal = session.amount_total ?? 0
  const amountMXN = amountTotal / 100

  const alloc = calculatePulseFundAllocationRounded(amountMXN, tierId)
  const fundAmount = alloc.fundAmountRounded
  const platformAmount = alloc.platformAmountRounded
  const fundPctLabel = Math.round(alloc.fundPercent * 100)

  const supabase = getSupabase()
  const months = PULSE_TIERS[tierId].sponsorshipMonths ?? 3
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
      sponsor_name: companyName,
      sponsor_email: contactEmail,
      sponsor_url: (metadata.website as string) || null,
      sponsor_logo_url: logoUrl,
      market_id: null,
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
    console.error('Pulse purchase: failed to create sponsorship record', sponsorError)
    throw new Error(`Pulse sponsorship insert failed: ${sponsorError.message}`)
  }

  const sponsorshipId = sponsorship?.id

  const { error: sponsorshipLogError } = await (supabase as any)
    .from('sponsorship_log')
    .upsert(
      {
        stripe_session_id: session.id,
        sponsorship_id: sponsorshipId,
        sponsor_name: companyName,
        is_anonymous: false,
        sponsor_tier: tierId,
        amount_paid: amountMXN,
        stripe_fee: alloc.stripeFeeRounded,
        net_amount: alloc.netAmountRounded,
        fund_allocation: fundAmount,
        fund_percent: alloc.fundPercent,
        platform_revenue: platformAmount,
        market_id: null,
        cause_id: null,
        paid_at: new Date().toISOString(),
        is_public: true,
      },
      { onConflict: 'stripe_session_id' }
    )

  if (sponsorshipLogError) {
    console.error('Pulse purchase: sponsorship_log upsert failed', sponsorshipLogError)
  }

  const { error: fundTxError } = await (supabase as any)
    .from('conscious_fund_transactions')
    .insert({
      amount: fundAmount,
      source_type: 'sponsorship' as const,
      source_id: sponsorshipId,
      market_id: null,
      description: `Conscious Pulse (${tierId}) — ${companyName} — ~${fundPctLabel}% (est. net) to Conscious Fund. Session: ${session.id}`,
    })

  if (fundTxError) {
    console.error('Pulse purchase: failed to insert fund transaction', fundTxError)
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

  const stripeCustomerId =
    typeof session.customer === 'string' && session.customer ? session.customer : null

  const sponsorAccount = await upsertPulseSponsorAccount(supabase, {
    email: contactEmail,
    companyName,
    sponsorLogoUrl: logoUrl,
    tierId,
    amountMXN,
    fundAmount,
    stripeCustomerId,
    contactName: session.customer_details?.name ?? null,
  })

  if (couponId && contactEmail) {
    await recordStripeCouponRedemption(supabase, {
      couponId,
      email: contactEmail,
      sponsorName: companyName,
      sponsorAccountId: sponsorAccount?.id ?? null,
    })
  }

  if (contactEmail) {
    await sendSponsorConfirmationEmail(
      contactEmail,
      companyName,
      tierId,
      amountMXN,
      undefined,
      undefined,
      undefined,
      sponsorshipId,
      reportToken,
      sponsorAccount?.access_token
    )
  }

  await sendSponsorshipAdminNotification({
    sponsorName: companyName,
    sponsorEmail: contactEmail,
    sponsorUrl: (metadata.website as string) || '',
    tier: tierId,
    amountMXN,
    fundAmount,
    platformAmount,
    fundPercent: alloc.fundPercent,
    marketTitle: 'Conscious Pulse (B2B)',
  })

  console.log('Pulse purchase completed:', {
    sessionId: session.id,
    sponsorshipId,
    companyName,
    tier: tierId,
    amountMXN,
    fundAmount,
    dashboard: sponsorAccount ? `/dashboard/sponsor/${sponsorAccount.access_token}` : null,
  })
}
