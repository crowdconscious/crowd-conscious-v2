import Stripe from 'stripe'
import { getSupabase } from '../lib/stripe-webhook-utils'
import {
  PULSE_TIERS,
  calculatePulseFundAllocationRounded,
  normalizePulseTierId,
  type PulseTierId,
} from '@/lib/pulse-tiers'
import { getPulseTierBenefits } from '@/lib/pulse-tier-benefits'
import { sendSponsorshipAdminNotification } from '@/lib/resend'

type SponsorRow = {
  id: string
  access_token: string
  tier: string | null
  company_name: string | null
  contact_email: string | null
  total_spent: number | null
  total_fund_contribution: number | null
  used_pulse_markets: number | null
  last_upgrade_session_id: string | null
}

/**
 * Dashboard-initiated tier upgrade.
 *
 * - Updates the existing sponsor_accounts row (never inserts a new one).
 * - Writes previous_tier, tier_upgraded_at, last_upgrade_session_id.
 * - Resets used_pulse_markets to 0 for target = 'suscripcion' (new monthly
 *   quota); preserves usage otherwise so an in-flight Pulse Único holder
 *   upgrading to Pack keeps their running Pulse count.
 * - Records the payment in sponsorships + sponsorship_log + fund_transaction
 *   so the Fund thermometer and reports treat it identically to a Pulse
 *   purchase.
 * - Idempotent: if last_upgrade_session_id already equals this session id,
 *   returns early without writing. Protects against Stripe webhook retries.
 */
export async function handleSponsorUpgrade(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {}
  if (metadata.product_type !== 'sponsor_upgrade') return

  const sponsorAccountId = (metadata.existing_sponsor_account_id as string) || ''
  if (!sponsorAccountId) {
    console.error('[sponsor_upgrade] missing existing_sponsor_account_id')
    throw new Error('sponsor_upgrade: missing existing_sponsor_account_id')
  }

  const targetTier = normalizePulseTierId(metadata.target_tier as string)
  if (targetTier !== 'pulse_unico' && targetTier !== 'pulse_pack' && targetTier !== 'suscripcion') {
    console.error('[sponsor_upgrade] non-checkout target tier', {
      sponsorAccountId,
      targetTier,
    })
    throw new Error(`sponsor_upgrade: unexpected target_tier '${targetTier}'`)
  }

  const amountTotal = session.amount_total ?? 0
  const amountMXN = amountTotal / 100
  const alloc = calculatePulseFundAllocationRounded(amountMXN, targetTier)
  const fundAmount = alloc.fundAmountRounded
  const platformAmount = alloc.platformAmountRounded
  const fundPctLabel = Math.round(alloc.fundPercent * 100)

  const supabase = getSupabase()

  const { data: existing, error: fetchErr } = (await (supabase as any)
    .from('sponsor_accounts')
    .select(
      'id, access_token, tier, company_name, contact_email, total_spent, total_fund_contribution, used_pulse_markets, last_upgrade_session_id'
    )
    .eq('id', sponsorAccountId)
    .maybeSingle()) as { data: SponsorRow | null; error: unknown }

  if (fetchErr || !existing) {
    console.error('[sponsor_upgrade] sponsor_account not found', fetchErr)
    throw new Error('sponsor_upgrade: sponsor_account not found')
  }

  // Idempotency guard: if we've already applied this session id, exit.
  if (existing.last_upgrade_session_id === session.id) {
    console.log('[sponsor_upgrade] duplicate webhook for session', session.id, '— skipping')
    return
  }

  const previousTier = existing.tier ?? null
  const benefits = getPulseTierBenefits(targetTier)
  const subscriptionActive = targetTier === 'suscripcion'

  // Reset monthly quota for subscription starts; preserve otherwise so a
  // Pulse-Único sponsor keeping one Pulse in-flight while upgrading to Pack
  // doesn't accidentally get that Pulse re-counted twice.
  const nextUsedPulseMarkets = targetTier === 'suscripcion'
    ? 0
    : Math.min(Number(existing.used_pulse_markets ?? 0), benefits.max_pulse_markets)

  const patch = {
    tier: targetTier,
    previous_tier: previousTier,
    tier_upgraded_at: new Date().toISOString(),
    last_upgrade_session_id: session.id,
    is_pulse_client: true,
    pulse_subscription_active: subscriptionActive,
    max_pulse_markets: benefits.max_pulse_markets,
    max_live_events: benefits.max_live_events,
    has_custom_branding: benefits.has_custom_branding,
    has_api_access: benefits.has_api_access,
    has_white_label: benefits.has_white_label,
    used_pulse_markets: nextUsedPulseMarkets,
    total_spent: Number(existing.total_spent ?? 0) + amountMXN,
    total_fund_contribution: Number(existing.total_fund_contribution ?? 0) + fundAmount,
  }

  const { error: updErr } = await (supabase as any)
    .from('sponsor_accounts')
    .update(patch)
    .eq('id', sponsorAccountId)
    // Extra belt-and-suspenders: the partial unique index on
    // last_upgrade_session_id would reject a concurrent duplicate anyway.
    .or(`last_upgrade_session_id.is.null,last_upgrade_session_id.neq.${session.id}`)

  if (updErr) {
    console.error('[sponsor_upgrade] sponsor_accounts update failed', updErr)
    throw new Error(updErr.message)
  }

  const companyName = existing.company_name || (metadata.company_name as string) || 'Pulse client'
  const contactEmail = (existing.contact_email || '').trim()
  const months = PULSE_TIERS[targetTier as PulseTierId].sponsorshipMonths ?? 1
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + months)
  const reportToken = crypto.randomUUID()

  const { data: sponsorship, error: sponsorError } = await (supabase as any)
    .from('sponsorships')
    .insert({
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string | null,
      amount_mxn: amountMXN,
      tier: targetTier,
      status: 'active',
      sponsor_name: companyName,
      sponsor_email: contactEmail,
      sponsor_url: null,
      sponsor_logo_url: null,
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
    // Upgrade already applied on sponsor_accounts; don't throw and undo that.
    // Log for reconciliation.
    console.error('[sponsor_upgrade] sponsorship insert failed (non-fatal)', sponsorError)
  }

  const sponsorshipId = sponsorship?.id ?? null

  const { error: sponsorshipLogError } = await (supabase as any)
    .from('sponsorship_log')
    .upsert(
      {
        stripe_session_id: session.id,
        sponsorship_id: sponsorshipId,
        sponsor_name: companyName,
        is_anonymous: false,
        sponsor_tier: targetTier,
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
    console.error('[sponsor_upgrade] sponsorship_log upsert failed', sponsorshipLogError)
  }

  const { error: fundTxError } = await (supabase as any)
    .from('conscious_fund_transactions')
    .insert({
      amount: fundAmount,
      source_type: 'sponsorship' as const,
      source_id: sponsorshipId,
      market_id: null,
      description: `Sponsor upgrade (${previousTier ?? '—'} → ${targetTier}) — ${companyName} — ~${fundPctLabel}% to Conscious Fund. Session: ${session.id}`,
    })

  if (fundTxError) {
    console.error('[sponsor_upgrade] fund transaction insert failed', fundTxError)
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

  try {
    await sendSponsorshipAdminNotification({
      sponsorName: companyName,
      sponsorEmail: contactEmail,
      sponsorUrl: '',
      tier: `${previousTier ?? '—'} → ${targetTier}`,
      amountMXN,
      fundAmount,
      platformAmount,
      fundPercent: alloc.fundPercent,
      marketTitle: 'Conscious Pulse upgrade (in-dashboard)',
    })
  } catch (e) {
    console.error('[sponsor_upgrade] admin notification failed', e)
  }

  console.log('[sponsor_upgrade] completed:', {
    sessionId: session.id,
    sponsorAccountId,
    previousTier,
    targetTier,
    amountMXN,
    fundAmount,
  })
}
