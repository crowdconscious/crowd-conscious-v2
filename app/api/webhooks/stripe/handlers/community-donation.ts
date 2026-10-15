import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { getStripe } from '../lib/stripe-webhook-utils'
import { DONATION_PRODUCT_TYPE } from '@/lib/patrocinio/donations'
import { sendDonationAdminAlert, sendDonorReceipt, type DonationEmailRow } from '@/lib/patrocinio/emails'

/**
 * Patrocinio comunitario donation (metadata.product_type = 'community_donation').
 *
 * Idempotent by stripe_checkout_session_id:
 *  1. insert row ON CONFLICT DO NOTHING;
 *  2. fill fee/net from the charge's balance_transaction if still unknown;
 *  3. credit the Fondo via credit_community_donation() (atomic, once);
 *  4. claim emails via emails_claimed_at IS NULL; release + throw on failure so Stripe retries.
 * If Stripe has no balance_transaction yet, the gross is recorded, fee/net stay
 * NULL and the Fondo is NOT credited until charge.updated/charge.succeeded
 * backfills them via handleCommunityDonationCharge (credited exactly once).
 */
type Fee = { feeMxn: number; netMxn: number }

/** Fee/net in MXN from a balance transaction (converts if the account settles in another currency). */
function feeFromBalanceTxn(bt: Stripe.BalanceTransaction, chargeCurrency: string): Fee | null {
  if (bt.currency === 'mxn') return { feeMxn: bt.fee / 100, netMxn: bt.net / 100 }
  // Settlement in another currency: exchange_rate converts presentment -> settlement.
  if (chargeCurrency === 'mxn' && bt.exchange_rate) {
    const r = bt.exchange_rate
    const round = (n: number) => Math.round(n * 100) / 100
    return { feeMxn: round(bt.fee / 100 / r), netMxn: round(bt.net / 100 / r) }
  }
  return null
}

async function feeFromCharge(charge: Stripe.Charge | string | null | undefined): Promise<Fee | null> {
  if (!charge) return null
  let c: Stripe.Charge = typeof charge === 'string' ? await getStripe().charges.retrieve(charge) : charge
  let bt = c.balance_transaction
  if (!bt) return null // not created yet; charge.updated will deliver it
  if (typeof bt === 'string') bt = await getStripe().balanceTransactions.retrieve(bt)
  return feeFromBalanceTxn(bt, c.currency)
}

/**
 * The balance transaction is often not attached yet when checkout.session.completed
 * fires (it is created asynchronously). Try a few times with short backoff; if still
 * missing, the charge.updated / charge.succeeded backfill credits the Fondo later.
 */
async function fetchFee(paymentIntentId: string | null, attempts = 3): Promise<Fee | null> {
  if (!paymentIntentId) return null
  for (let i = 0; i < attempts; i++) {
    try {
      const pi = await getStripe().paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge.balance_transaction'],
      })
      const fee = await feeFromCharge(pi.latest_charge)
      if (fee) return fee
    } catch (err) {
      console.error('[community-donation] fee lookup failed', err instanceof Error ? err.message : err)
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 700 * (i + 1)))
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyFeeAndCredit(db: any, match: { col: string; val: string }, fee: Fee): Promise<void> {
  const { data: rows, error: upErr } = await db
    .from('community_donations')
    .update({
      stripe_fee_mxn: fee.feeMxn,
      net_mxn: fee.netMxn,
      fee_source: 'stripe_balance_transaction',
      updated_at: new Date().toISOString(),
    })
    .eq(match.col, match.val)
    .is('net_mxn', null)
    .select('stripe_checkout_session_id')
  if (upErr) throw new Error(`[community-donation] fee update failed: ${upErr.message}`)
  // Credit every matching session (normally one). The RPC is atomic and credits once
  // (fund_credited=false guard), so concurrent/duplicate webhooks never double-credit.
  const { data: all } = await db
    .from('community_donations')
    .select('stripe_checkout_session_id')
    .eq(match.col, match.val)
    .eq('fund_credited', false)
    .not('net_mxn', 'is', null)
  for (const r of (all ?? rows ?? []) as { stripe_checkout_session_id: string }[]) {
    const { error: rpcErr } = await db.rpc('credit_community_donation', { p_session_id: r.stripe_checkout_session_id })
    if (rpcErr) throw new Error(`[community-donation] fund credit failed: ${rpcErr.message}`)
  }
}

/**
 * charge.succeeded / charge.updated: backfill fee/net and credit the Fondo once, for a
 * donation whose fee was unavailable at checkout.session.completed. No-op for other charges.
 */
export async function handleCommunityDonationCharge(charge: Stripe.Charge) {
  // Charges normally carry the PaymentIntent metadata, but don't rely on it: the DB
  // lookup by payment_intent below is the real filter.
  const md = charge.metadata?.product_type
  if (md && md !== DONATION_PRODUCT_TYPE) return
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!piId || charge.status !== 'succeeded' || !charge.balance_transaction) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const { data: pending } = await db
    .from('community_donations')
    .select('id')
    .eq('stripe_payment_intent_id', piId)
    .eq('fund_credited', false)
    .limit(1)
  if (!pending?.length) return // already credited, or row not inserted yet (session handler will fetch fee)
  const fee = await feeFromCharge(charge)
  if (!fee) {
    console.warn('[community-donation] charge event without usable balance txn', { chargeId: charge.id })
    return
  }
  await applyFeeAndCredit(db, { col: 'stripe_payment_intent_id', val: piId }, fee)
  console.log('[community-donation] fee backfilled from charge event', { chargeId: charge.id, piId })
}

export async function handleCommunityDonation(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') {
    console.log('[community-donation] session not paid; ignoring', { sessionId: session.id })
    return
  }
  // Table/RPC are not in generated types until migration 285 is applied.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const table = () => db.from('community_donations')
  const md = session.metadata ?? {}
  const nowIso = new Date().toISOString()
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null
  const amount = (session.amount_total ?? 0) / 100
  const anonymous = md.is_anonymous === 'true'
  const email = md.donor_email || session.customer_details?.email || null

  const { error: insErr } = await table().upsert(
    {
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status: 'paid',
      currency: session.currency ?? 'mxn',
      amount_mxn: amount,
      donor_name: anonymous ? null : md.donor_name || null,
      donor_email: email,
      is_anonymous: anonymous,
      locale: md.locale === 'en' ? 'en' : 'es',
      receipt_number: `CC-DON-${nowIso.slice(0, 10).replace(/-/g, '')}-${session.id.slice(-12).toUpperCase()}`,
      paid_at: nowIso,
    },
    { onConflict: 'stripe_checkout_session_id', ignoreDuplicates: true }
  )
  if (insErr) throw new Error(`[community-donation] insert failed: ${insErr.message}`)

  const { data: existing } = await table()
    .select('net_mxn, fund_credited')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle()
  if (!existing?.fund_credited) {
    const fee = existing?.net_mxn != null ? null : await fetchFee(paymentIntentId)
    if (fee) {
      await applyFeeAndCredit(db, { col: 'stripe_checkout_session_id', val: session.id }, fee)
    } else if (existing?.net_mxn != null) {
      const { error: rpcErr } = await db.rpc('credit_community_donation', { p_session_id: session.id })
      if (rpcErr) throw new Error(`[community-donation] fund credit failed: ${rpcErr.message}`)
    } else {
      console.warn('[community-donation] fee not yet available; will backfill on charge.updated', { sessionId: session.id })
    }
  }

  const { data: claimed, error: claimErr } = await table()
    .update({ emails_claimed_at: new Date().toISOString() })
    .eq('stripe_checkout_session_id', session.id)
    .is('emails_claimed_at', null)
    .select('*')
    .maybeSingle()
  if (claimErr) throw new Error(`[community-donation] claim failed: ${claimErr.message}`)
  if (!claimed) return
  const row = claimed as DonationEmailRow & { donor_receipt_sent_at: string | null; admin_alert_sent_at: string | null }

  const failures: string[] = []
  if (!row.donor_receipt_sent_at) {
    const r = await sendDonorReceipt(row)
    if (r.success) await table().update({ donor_receipt_sent_at: new Date().toISOString() }).eq('id', row.id)
    else failures.push(`receipt: ${'error' in r ? r.error : ''}`)
  }
  if (!row.admin_alert_sent_at) {
    const a = await sendDonationAdminAlert(row)
    if (a.success) await table().update({ admin_alert_sent_at: new Date().toISOString() }).eq('id', row.id)
    else failures.push(`admin: ${a.error}`)
  }
  if (failures.length) {
    await table().update({ emails_claimed_at: null }).eq('id', row.id)
    throw new Error(`[community-donation] email send failed (${failures.join('; ')}); claim released for retry`)
  }
}
