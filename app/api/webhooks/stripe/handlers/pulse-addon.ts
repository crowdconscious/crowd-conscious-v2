import Stripe from 'stripe'
import { getSupabase } from '../lib/stripe-webhook-utils'
import { calculatePulseFundAllocationRounded, normalizePulseTierId } from '@/lib/pulse-tiers'

/**
 * Extra Pulse slots: increments max_pulse_markets (Pulse Único add-on checkout).
 */
export async function handlePulseAddon(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {}
  if (metadata.product_type !== 'pulse_addon') return

  const sponsorAccountId = metadata.sponsor_account_id as string | undefined
  const qty = Math.max(1, parseInt(String(metadata.quantity || '1'), 10) || 1)
  const amountTotal = session.amount_total ?? 0
  const amountMXN = amountTotal / 100

  if (!sponsorAccountId) {
    console.error('pulse_addon: missing sponsor_account_id')
    throw new Error('pulse_addon: missing sponsor_account_id')
  }

  const supabase = getSupabase()

  const { data: account, error: accErr } = await (supabase as any)
    .from('sponsor_accounts')
    .select('id, max_pulse_markets, total_spent, total_fund_contribution')
    .eq('id', sponsorAccountId)
    .maybeSingle()

  if (accErr || !account) {
    console.error('pulse_addon: account not found', accErr)
    throw new Error('pulse_addon: sponsor account not found')
  }

  const tierId = normalizePulseTierId('pulse_unico')
  const alloc = calculatePulseFundAllocationRounded(amountMXN, tierId)
  const fundAmount = alloc.fundAmountRounded

  const { error: updErr } = await (supabase as any)
    .from('sponsor_accounts')
    .update({
      max_pulse_markets: Number(account.max_pulse_markets ?? 1) + qty,
      total_spent: Number(account.total_spent ?? 0) + amountMXN,
      total_fund_contribution: Number(account.total_fund_contribution ?? 0) + fundAmount,
    })
    .eq('id', sponsorAccountId)

  if (updErr) {
    console.error('pulse_addon: sponsor_accounts update failed', updErr)
    throw new Error(updErr.message)
  }

  const { error: fundTxError } = await (supabase as any)
    .from('conscious_fund_transactions')
    .insert({
      amount: fundAmount,
      source_type: 'sponsorship' as const,
      source_id: null,
      market_id: null,
      description: `Pulse add-on (+${qty} slots) — session ${session.id}`,
    })

  if (fundTxError) {
    console.error('pulse_addon: fund insert failed', fundTxError)
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

  console.log('pulse_addon completed:', { sessionId: session.id, sponsorAccountId, qty, amountMXN })
}
