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
 * charge.refunded → mark the sponsorship 'refunded', void the accrued payout,
 * and DECREMENT the Conscious Fund ledger with a negative reversing
 * contribution row.
 *
 * IDEMPOTENT (double-decrement safe): a sponsorship already in 'refunded'
 * short-circuits before any write, so a re-delivered charge.refunded never
 * reaches the reversal. As a belt-and-suspenders guard, the reversal write also
 * checks for an existing negative row for this sponsorship_id first.
 *
 * FULL vs PARTIAL: this codebase only models FULL refunds (charge.refunded flips
 * status to 'refunded' and voids the whole creator_amount; there is no partial-
 * refund path). So the reversal undoes the FULL original fund_amount.
 *
 * MIGRATION DEPENDENCY: the negative INSERT requires migration
 * 236_fund_contributions_allow_reversals to have been applied (it drops the
 * old `amount >= 0` CHECK). Until then the DB rejects the row; we log and
 * continue (no throw) so the webhook still returns 200.
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

  // Decrement the Conscious Fund ledger: write a paired NEGATIVE contribution
  // that exactly reverses the 20% inflow booked at checkout.
  await reverseFundContribution(supabase, sponsorship)

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
 * Write the negative reversing row into conscious_fund_contributions so
 * SUM(amount) (and the public `conscious_fund_contributions_totals` view) nets
 * down by the refunded sponsorship's fund cut.
 *
 *   amount = -(creator_sponsorships.fund_amount)   ← reversed, NOT recomputed
 *
 * The other ledger fields are MIRRORED from the original positive contribution
 * row (source_type / source_id / fund_pillar / currency) so the reversal is an
 * exact mirror; we fall back to the sponsorship row's snapshot if the original
 * contribution can't be found.
 *
 * Idempotency: skip if a negative row for this sponsorship_id already exists.
 * Failure is non-fatal (logged, not thrown) so the webhook still returns 200 —
 * notably while migration 236 has not yet been applied.
 */
async function reverseFundContribution(
  supabase: ReturnType<typeof getMoneyClient>,
  sponsorship: CreatorSponsorshipRow
) {
  const fundAmount = Number(sponsorship.fund_amount ?? 0)
  // Nothing was booked into the fund (e.g. fund_amount 0/null) ⇒ nothing to reverse.
  if (!(fundAmount > 0)) return

  // Belt-and-suspenders idempotency: never write a second reversal for the same
  // sponsorship even if the top-level status guard is somehow bypassed.
  const { data: existingReversal, error: existingErr } = await supabase
    .from('conscious_fund_contributions')
    .select('id')
    .eq('sponsorship_id', sponsorship.id)
    .lt('amount', 0)
    .maybeSingle()
  if (existingErr) {
    console.error('[sponsorship-refund] reversal lookup failed', existingErr)
    return
  }
  if (existingReversal) {
    console.log('[sponsorship-refund] fund reversal already recorded (idempotent skip)', {
      sponsorshipId: sponsorship.id,
    })
    return
  }

  // Mirror the original positive contribution row's tagging where possible.
  const { data: original } = await supabase
    .from('conscious_fund_contributions')
    .select('source_type, source_id, fund_pillar, currency')
    .eq('sponsorship_id', sponsorship.id)
    .gt('amount', 0)
    .maybeSingle()

  const sourceType =
    (original?.source_type as string | null) ?? sponsorship.source_type
  const sourceId =
    (original?.source_id as string | null) ?? sponsorship.source_id
  const fundPillar = (original?.fund_pillar as string | null) ?? null
  const currency =
    (original?.currency as string | null) ?? sponsorship.currency ?? 'MXN'

  const { error: reversalErr } = await supabase
    .from('conscious_fund_contributions')
    .insert({
      source_type: sourceType,
      source_id: sourceId,
      amount: -fundAmount,
      currency,
      fund_pillar: fundPillar,
      sponsorship_id: sponsorship.id,
    })
  if (reversalErr) {
    // Most likely cause before migration 236 is applied: the old
    // `amount >= 0` CHECK rejects the negative row (Postgres 23514). We log and
    // continue so the webhook still succeeds; the reversal can be re-driven once
    // the migration is live.
    console.error('[sponsorship-refund] fund contribution reversal failed', reversalErr)
  }
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
