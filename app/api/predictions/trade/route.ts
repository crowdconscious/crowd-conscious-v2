import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { tradeSchema } from '@/lib/prediction-schemas'
import { validateRequest } from '@/lib/validation-schemas'
import {
  moderateRateLimit,
  getRateLimitIdentifier,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const identifier = await getRateLimitIdentifier(request, user.id)
    const limitResult = await checkRateLimit(moderateRateLimit, identifier)
    if (limitResult && !limitResult.allowed) {
      return rateLimitResponse(
        limitResult.limit,
        limitResult.remaining,
        limitResult.reset
      )
    }

    let validatedData
    try {
      validatedData = await validateRequest(request, tradeSchema)
    } catch (error: unknown) {
      const err = error as { status?: number; error?: unknown }
      if (err.status === 422) {
        return NextResponse.json(err.error ?? error, { status: 422 })
      }
      throw error
    }

    const { market_id, side, amount } = validatedData

    const supabase = await createClient()

    const { data: tradeMarket } = await supabase
      .from('prediction_markets')
      .select('archived_at')
      .eq('id', market_id)
      .maybeSingle()
    if (tradeMarket?.archived_at) {
      return NextResponse.json({ error: 'Market is archived' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('execute_prediction_trade', {
      p_user_id: user.id,
      p_market_id: market_id,
      p_side: side,
      p_amount: amount,
    })

    if (error) {
      console.error('Trade error:', error)
      return NextResponse.json(
        { error: error.message || 'Trade failed' },
        { status: 400 }
      )
    }

    const trade = data as {
      id: string
      market_id: string
      amount: number
      side: string
      price: number
      fee_amount: number
      conscious_fund_amount: number
    }

    // Fetch updated market for new_probability
    const { data: updatedMarket } = await supabase
      .from('prediction_markets')
      .select('current_probability')
      .eq('id', market_id)
      .single()

    const pricePerShare = trade.side === 'yes'
      ? (Number(trade.price) * 10)
      : ((1 - Number(trade.price)) * 10)
    const netAmount = trade.amount - Number(trade.fee_amount) - Number(trade.conscious_fund_amount)
    const sharesReceived = pricePerShare > 0 ? netAmount / pricePerShare : 0
    const potentialPayout = sharesReceived * 10

    try {
      const admin = createAdminClient()
      await admin.from('audit_logs').insert({
        action: 'prediction_trade',
        target_type: 'prediction_trade',
        target_id: trade.id,
        target_name: `Trade ${trade.side} ${trade.amount} MXN on market`,
        performed_by: user.id,
        details: {
          market_id: trade.market_id,
          side: trade.side,
          amount: trade.amount,
        },
      })
    } catch (auditErr) {
      console.error('Audit log error (non-fatal):', auditErr)
    }

    const { count } = await supabase
      .from('prediction_trades')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const isFirstTrade = (count ?? 0) <= 1

    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_action_type: 'prediction_trade',
      p_action_id: trade.id,
      p_description: 'Prediction market trade',
    })

    if (isFirstTrade) {
      try {
        await supabase.rpc('award_xp', {
          p_user_id: user.id,
          p_action_type: 'prediction_first_trade',
          p_action_id: trade.id,
          p_description: 'First prediction trade',
        })
      } catch {
        // prediction_first_trade may not exist in xp_rewards
      }
    }

    const xpGained = isFirstTrade ? 75 : 25

    return NextResponse.json({
      success: true,
      trade: data,
      xpGained,
      shares_received: sharesReceived,
      price_per_share: pricePerShare,
      new_probability: updatedMarket?.current_probability ?? null,
      potential_payout: potentialPayout,
    })
  } catch (err) {
    console.error('Trade route error:', err)
    return NextResponse.json(
      { error: 'Trade failed' },
      { status: 500 }
    )
  }
}
