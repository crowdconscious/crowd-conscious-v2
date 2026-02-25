import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Handle payment intent succeeded event
 */
export async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  console.log('💰 Payment succeeded:', {
    intentId: intent.id,
    amount: intent.amount,
    currency: intent.currency,
    metadata: intent.metadata,
  })

  const metadata = intent.metadata || {}
  const type = metadata.type as string | undefined

  if (type === 'prediction_deposit') {
    await handlePredictionDeposit(intent)
    return
  }

  // Future: Add other payment_intent.succeeded handlers (e.g. marketplace, etc.)
}

/**
 * Handle prediction wallet deposit - credit wallet when Stripe payment succeeds
 */
async function handlePredictionDeposit(intent: Stripe.PaymentIntent) {
  const metadata = intent.metadata || {}
  const userId = metadata.user_id as string | undefined
  const walletId = metadata.wallet_id as string | undefined

  if (!userId || !walletId) {
    console.error('❌ Prediction deposit missing user_id or wallet_id:', metadata)
    throw new Error('Invalid prediction deposit metadata')
  }

  const amountMxn = intent.amount / 100 // Stripe amount is in cents
  const supabase = createAdminClient()

  // Idempotency: check if already processed
  const { data: existing } = await supabase
    .from('prediction_deposits')
    .select('id')
    .eq('stripe_payment_intent_id', intent.id)
    .single()

  if (existing) {
    console.log('⏭️ Prediction deposit already processed (idempotent):', intent.id)
    return
  }

  // Insert deposit record (idempotency + audit)
  const { error: insertError } = await supabase
    .from('prediction_deposits')
    .insert({
      user_id: userId,
      wallet_id: walletId,
      stripe_payment_intent_id: intent.id,
      amount: amountMxn,
      status: 'completed',
    })

  if (insertError) {
    if (insertError.code === '23505') {
      // Unique violation - already processed by concurrent webhook
      console.log('⏭️ Prediction deposit already processed (race):', intent.id)
      return
    }
    console.error('❌ Failed to insert prediction_deposits:', insertError)
    throw insertError
  }

  // Credit wallet: fetch current balance, then update
  const { data: wallet, error: fetchError } = await supabase
    .from('prediction_wallets')
    .select('balance, total_deposited')
    .eq('id', walletId)
    .single()

  if (fetchError || !wallet) {
    console.error('❌ Wallet not found:', walletId, fetchError)
    throw new Error('Wallet not found')
  }

  const newBalance = Number(wallet.balance) + amountMxn
  const newTotalDeposited = Number(wallet.total_deposited) + amountMxn

  const { error: updateError } = await supabase
    .from('prediction_wallets')
    .update({
      balance: newBalance,
      total_deposited: newTotalDeposited,
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId)

  if (updateError) {
    console.error('❌ Failed to credit wallet:', updateError)
    throw updateError
  }

  // Audit log (use admin client - audit_logs requires admin to insert)
  try {
    await supabase.from('audit_logs').insert({
      action: 'prediction_deposit',
      target_type: 'prediction_wallet',
      target_id: walletId,
      target_name: `Deposit ${amountMxn} MXN`,
      performed_by: userId,
      details: {
        stripe_payment_intent_id: intent.id,
        amount: amountMxn,
        wallet_id: walletId,
      },
    })
  } catch (auditErr) {
    console.warn('⚠️ Audit log failed (non-fatal):', auditErr)
  }

  console.log('✅ Prediction wallet credited:', { walletId, amountMxn, userId })
}

/**
 * Handle payment intent failed event
 */
export async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  console.log('❌ Payment failed:', {
    intentId: intent.id,
    amount: intent.amount,
    currency: intent.currency,
    lastError: (intent as any).last_payment_error,
  })

  // Future: Add failure notification logic, retry mechanisms, etc.
}
