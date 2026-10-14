import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { PILOT_BREAKDOWN } from '@/lib/organizaciones/pricing'
import { sendOrgAdminAlert, sendOrgClientReceipt, type OrgPilotEmailRow } from '@/lib/organizaciones/emails'

/**
 * B2B "Lectura piloto privada" (metadata.product_type = 'org_pilot').
 *
 * Idempotency: Stripe may deliver checkout.session.completed and
 * checkout.session.async_payment_succeeded more than once. We (1) mark the
 * row paid only if it is not already, and (2) atomically claim the email
 * send via `emails_claimed_at IS NULL`, so only one delivery sends. If a send
 * fails we release the claim and throw so Stripe retries.
 */
export async function handleOrgPilotCheckout(session: Stripe.Checkout.Session) {
  const requestId = session.metadata?.org_pilot_request_id || session.client_reference_id
  if (!requestId) {
    console.error('[org-pilot] missing org_pilot_request_id', { sessionId: session.id })
    return
  }
  const db = createAdminClient()
  const table = () => db.from('org_pilot_requests')

  if (session.payment_status !== 'paid') {
    // Bank transfer (SPEI) sessions complete first as unpaid; wait for
    // checkout.session.async_payment_succeeded.
    await table()
      .update({ status: 'awaiting_transfer', stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'pending_payment')
    console.log('[org-pilot] awaiting async payment', { sessionId: session.id, requestId })
    return
  }

  const expectedCents = Math.round(PILOT_BREAKDOWN.total * 100)
  if (session.amount_total != null && session.amount_total !== expectedCents) {
    console.error('[org-pilot] unexpected amount_total', { sessionId: session.id, amount: session.amount_total, expectedCents })
  }

  const nowIso = new Date().toISOString()
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null
  const receiptNumber = `CC-PIL-${nowIso.slice(0, 10).replace(/-/g, '')}-${requestId.slice(0, 6).toUpperCase()}`

  await table()
    .update({
      status: 'paid',
      paid_at: nowIso,
      receipt_number: receiptNumber,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      updated_at: nowIso,
    })
    .eq('id', requestId)
    .neq('status', 'paid')

  const { data: claimed, error: claimErr } = await table()
    .update({ emails_claimed_at: nowIso })
    .eq('id', requestId)
    .eq('status', 'paid')
    .is('emails_claimed_at', null)
    .select('*')
    .maybeSingle()

  if (claimErr) throw new Error(`[org-pilot] claim failed: ${claimErr.message}`)
  if (!claimed) {
    console.log('[org-pilot] emails already sent or claimed; skipping', { requestId, sessionId: session.id })
    return
  }
  const row = claimed as unknown as OrgPilotEmailRow & {
    client_receipt_sent_at: string | null
    admin_alert_sent_at: string | null
  }

  const failures: string[] = []
  if (!row.client_receipt_sent_at) {
    const r = await sendOrgClientReceipt(row)
    if (r.success) await table().update({ client_receipt_sent_at: new Date().toISOString() }).eq('id', requestId)
    else failures.push(`receipt: ${r.error}`)
  }
  if (!row.admin_alert_sent_at) {
    const a = await sendOrgAdminAlert(row)
    if (a.success) await table().update({ admin_alert_sent_at: new Date().toISOString() }).eq('id', requestId)
    else failures.push(`admin: ${a.error}`)
  }

  if (failures.length) {
    await table().update({ emails_claimed_at: null }).eq('id', requestId)
    throw new Error(`[org-pilot] email send failed (${failures.join('; ')}); claim released for retry`)
  }
}

export async function handleOrgPilotAsyncFailed(session: Stripe.Checkout.Session) {
  const requestId = session.metadata?.org_pilot_request_id || session.client_reference_id
  if (!requestId) return
  await createAdminClient()
    .from('org_pilot_requests')
    .update({ status: 'payment_failed', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .neq('status', 'paid')
}
