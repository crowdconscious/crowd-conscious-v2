import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { getStripe } from '../lib/stripe-webhook-utils'
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
 * NULL, the Fondo is NOT credited, and the admin alert says to reconcile.
 */
async function fetchFee(paymentIntentId: string | null): Promise<{ feeMxn: number; netMxn: number } | null> {
  if (!paymentIntentId) return null
  try {
    const pi = await getStripe().paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    })
    const charge = pi.latest_charge
    if (!charge || typeof charge === 'string') return null
    const bt = charge.balance_transaction
    if (!bt || typeof bt === 'string' || bt.currency !== 'mxn') return null
    return { feeMxn: bt.fee / 100, netMxn: bt.net / 100 }
  } catch (err) {
    console.error('[community-donation] fee lookup failed', err instanceof Error ? err.message : err)
    return null
  }
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

  const fee = await fetchFee(paymentIntentId)
  if (fee) {
    await table()
      .update({
        stripe_fee_mxn: fee.feeMxn,
        net_mxn: fee.netMxn,
        fee_source: 'stripe_balance_transaction',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_checkout_session_id', session.id)
      .is('net_mxn', null)
    const { error: rpcErr } = await db.rpc('credit_community_donation', { p_session_id: session.id })
    if (rpcErr) throw new Error(`[community-donation] fund credit failed: ${rpcErr.message}`)
  } else {
    console.warn('[community-donation] fee unavailable; fund not credited, needs reconciliation', { sessionId: session.id })
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
