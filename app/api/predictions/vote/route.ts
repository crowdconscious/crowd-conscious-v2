import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { sendPostVoteConfirmation } from '@/lib/prediction-email-notifications'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { market_id, outcome_id, confidence } = body

    if (!market_id || !outcome_id) {
      return NextResponse.json(
        { error: 'market_id and outcome_id are required' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(market_id) || !UUID_REGEX.test(outcome_id)) {
      return NextResponse.json(
        { error: 'Invalid market_id or outcome_id' },
        { status: 400 }
      )
    }

    const conf = typeof confidence === 'number' ? confidence : parseInt(String(confidence), 10)
    if (isNaN(conf) || conf < 1 || conf > 10) {
      return NextResponse.json(
        { error: 'Confidence must be a number between 1 and 10' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('execute_market_vote', {
      p_user_id: user.id,
      p_market_id: market_id,
      p_outcome_id: outcome_id,
      p_confidence: conf,
    })

    if (error) {
      console.error('Vote RPC error:', error)
      return NextResponse.json(
        { error: error.message || 'Vote failed' },
        { status: 400 }
      )
    }

    const result = data as {
      success?: boolean
      error?: string
      xp_earned?: number
      outcome_label?: string
      confidence?: number
      new_probability?: number
      is_update?: boolean
      no_change?: boolean
    }
    if (result.success === false) {
      return NextResponse.json(
        { error: result.error || 'Vote failed' },
        { status: 400 }
      )
    }

    void sendPostVoteConfirmation({
      userId: user.id,
      email: user.email,
      marketId: market_id,
      rpcResult: result,
    }).catch((err) => console.error('[vote] post-confirmation', err))

    return NextResponse.json({
      ...result,
      is_update: result.is_update === true,
      no_change: result.no_change === true,
    })
  } catch (err) {
    console.error('Vote route error:', err)
    return NextResponse.json(
      { error: 'Vote failed' },
      { status: 500 }
    )
  }
}
