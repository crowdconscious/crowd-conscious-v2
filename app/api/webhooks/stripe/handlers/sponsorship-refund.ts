import Stripe from 'stripe'
import { getMoneyClient, currentPayoutPeriod } from '../lib/sponsorship-money'

type CreatorSponsorshipRow = {
  id: string
  status: string
  creator_id: string | null
  creator_amount: number | null
  currency: string | null
  source_type: string | null
  source_id: string | null
  fund_amount: number | null
  created_at: string
}

async function findSponsorshipByPaymentIntent(
  supabase: ReturnType<typeof getMoneyClient>,
  paymentIntentId: string | null
): Promise<CreatorSponsorshipRow | null> {
  if (!paymentIntentId) return null
  const { data, error } = await supabase
    .from('creator_sponsorships')
    .select(
      'id, status, creator_id, creator_amount, currency, source_type, source_id, fund_amount, created_at'
    )
    .eq('stripe_payment_intent', paymentIntentId)
    .maybeSingle()
  if (error) {
    console.error('[sponsorship-refund] lookup failed', error)
    return null
  }
  return (data as CreatorSponsorshipRow | null) ?? null
}

/** Period bucket the sponsorship's earnings landed in (from its created_at). */
function periodForSponsorship(row: CreatorSponsorshipRow): string {
  try {
    return currentPayoutPeriod(new Date(row.created_at))
  } catch {
    return currentPayoutPeriod()
  }
}

/**
 * charge.refunded → mark the sponsorship 'refunded' and void the accrued payout.
 *
 * IDEMPOTENT: a sponsorship already in 'refunded' short-circuits.
 *
 * NOTE / FLAGGED: the contract asks for a NEGATIVE reversing
 * conscious_fund_contributions row, but migration 233 puts a
 * `CHECK (amount >= 0)` on that table, so a negative inflow row is rejected by
 * the database. We therefore DO NOT write a negative contribution here (it would
 * throw). The reversal is recorded by flipping the sponsorship status; the fund
 * aggregate view will need a signed-reversal column (or a paired distributions
 * row) before negative reversals can be ledgered. Surfaced to the founder.
 */
export async function handleSponsorshipRefund(charge: Stripe.Charge) {
  const supabase = getMoneyClient()
  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : null

  const sponsorship = await findSponsorshipByPaymentIntent(supabase, paymentIntentId)
  if (!sponsorship) {
    // Not a creator-market sponsorship (e.g. a legacy pulse/market refund) —
    // nothing for this handler to do.
    return
  }
  if (sponsorship.status === 'refunded') {
    return
  }

  const { error: updErr } = await supabase
    .from('creator_sponsorships')
    .update({ status: 'refunded' })
    .eq('id', sponsorship.id)
  if (updErr) {
    console.error('[sponsorship-refund] status update failed', updErr)
    throw new Error(`creator_sponsorships refund update failed: ${updErr.message}`)
  }

  // Void the accrued payout line: subtract this sponsorship's creator_amount
  // from the period bucket (floored at 0). Buckets already 'paid' are left
  // untouched (money already left) and only annotated.
  await voidPayout(supabase, sponsorship)

  console.log('[sponsorship-refund] sponsorship refunded', {
    sponsorshipId: sponsorship.id,
    chargeId: charge.id,
  })
}

/**
 * charge.dispute.created → mark the sponsorship 'disputed' and FREEZE the
 * related payout bucket (status 'held') so finance reviews before any release.
 *
 * IDEMPOTENT: a sponsorship already in 'disputed' short-circuits.
 */
export async function handleSponsorshipDispute(dispute: Stripe.Dispute) {
  const supabase = getMoneyClient()
  const paymentIntentId =
    typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null

  const sponsorship = await findSponsorshipByPaymentIntent(supabase, paymentIntentId)
  if (!sponsorship) return
  if (sponsorship.status === 'disputed') return

  const { error: updErr } = await supabase
    .from('creator_sponsorships')
    .update({ status: 'disputed' })
    .eq('id', sponsorship.id)
  if (updErr) {
    console.error('[sponsorship-dispute] status update failed', updErr)
    throw new Error(`creator_sponsorships dispute update failed: ${updErr.message}`)
  }

  // Freeze the related payout so nothing pays out while the dispute is open.
  if (sponsorship.creator_id) {
    const period = periodForSponsorship(sponsorship)
    const { data: bucket } = await supabase
      .from('influencer_payouts')
      .select('id, status')
      .eq('creator_id', sponsorship.creator_id)
      .eq('period', period)
      .maybeSingle()
    if (bucket && bucket.status !== 'paid') {
      const { error: freezeErr } = await supabase
        .from('influencer_payouts')
        .update({
          status: 'held',
          note: `Frozen by dispute on sponsorship ${sponsorship.id} (${dispute.id})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bucket.id)
      if (freezeErr) {
        console.error('[sponsorship-dispute] payout freeze failed', freezeErr)
      }
    }
  }

  console.log('[sponsorship-dispute] sponsorship disputed', {
    sponsorshipId: sponsorship.id,
    disputeId: dispute.id,
  })
}

async function voidPayout(
  supabase: ReturnType<typeof getMoneyClient>,
  sponsorship: CreatorSponsorshipRow
) {
  const creatorAmount = Number(sponsorship.creator_amount ?? 0)
  if (!sponsorship.creator_id || creatorAmount <= 0) return

  const period = periodForSponsorship(sponsorship)
  const { data: bucket } = await supabase
    .from('influencer_payouts')
    .select('id, total_earned, status')
    .eq('creator_id', sponsorship.creator_id)
    .eq('period', period)
    .maybeSingle()
  if (!bucket) return

  if (bucket.status === 'paid') {
    await supabase
      .from('influencer_payouts')
      .update({
        note: `Refund on sponsorship ${sponsorship.id} after payout — manual clawback needed`,
        flagged_self_sponsor: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bucket.id)
    return
  }

  const nextTotal = Math.max(0, Number(bucket.total_earned ?? 0) - creatorAmount)
  const { error: updErr } = await supabase
    .from('influencer_payouts')
    .update({
      total_earned: nextTotal,
      note: `Voided creator_amount for refunded sponsorship ${sponsorship.id}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bucket.id)
  if (updErr) {
    console.error('[sponsorship-refund] payout void failed', updErr)
  }
}
