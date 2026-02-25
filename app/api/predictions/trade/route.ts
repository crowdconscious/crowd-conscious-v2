import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import {
  strictRateLimit,
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
    const limitResult = await checkRateLimit(strictRateLimit, identifier)
    if (limitResult && !limitResult.allowed) {
      return rateLimitResponse(
        limitResult.limit,
        limitResult.remaining,
        limitResult.reset
      )
    }

    const body = await request.json()
    const { market_id, side, amount } = body

    if (!market_id || !side || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'Missing market_id, side, or amount' },
        { status: 400 }
      )
    }

    if (!['yes', 'no'].includes(side)) {
      return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
    }

    if (amount < 10) {
      return NextResponse.json(
        { error: 'Minimum trade amount is 10 MXN' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
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

    // Award XP for prediction trade
    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_action_type: 'prediction_trade',
      p_action_id: data?.id || null,
      p_description: 'Prediction market trade',
    })

    return NextResponse.json({ success: true, trade: data, xpGained: 25 })
  } catch (err) {
    console.error('Trade route error:', err)
    return NextResponse.json(
      { error: 'Trade failed' },
      { status: 500 }
    )
  }
}
