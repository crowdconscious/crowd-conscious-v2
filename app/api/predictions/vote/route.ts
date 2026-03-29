import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { sendPostVoteConfirmation } from '@/lib/prediction-email-notifications'
import type { Database } from '@/types/database'

/** USD attributed to Conscious Fund cause per sponsored micro-market vote (env override). */
function sponsoredMicroMarketVoteImpactUsd(): number {
  const n = Number(process.env.LIVE_MICRO_MARKET_SPONSORED_VOTE_IMPACT_USD ?? 0.05)
  return Number.isFinite(n) && n > 0 ? n : 0.05
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CC_SESSION = 'cc_session'

async function applySponsoredMicroFundIfNeeded(
  marketId: string,
  supabase: SupabaseClient<Database>
) {
  const { data: marketMeta } = await supabase
    .from('prediction_markets')
    .select('is_micro_market, sponsor_label, live_event_id')
    .eq('id', marketId)
    .maybeSingle()

  const meta = marketMeta as {
    is_micro_market?: boolean | null
    sponsor_label?: string | null
    live_event_id?: string | null
  } | null

  if (
    meta?.is_micro_market === true &&
    typeof meta.sponsor_label === 'string' &&
    meta.sponsor_label.trim().length > 0 &&
    meta.live_event_id
  ) {
    const delta = sponsoredMicroMarketVoteImpactUsd()
    const admin = createAdminClient()
    const { error: fundErr } = await admin.rpc('increment_live_event_fund_impact', {
      p_live_event_id: meta.live_event_id,
      p_delta: delta,
    })
    if (fundErr) {
      console.error('[vote] increment_live_event_fund_impact', fundErr)
    }
  }
}

export async function POST(request: Request) {
  try {
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

    const user = await getCurrentUser()

    if (!user) {
      const cookieStore = await cookies()
      let sessionId = cookieStore.get(CC_SESSION)?.value
      if (!sessionId || !UUID_REGEX.test(sessionId)) {
        sessionId = crypto.randomUUID()
      }

      const admin = createAdminClient()
      const { data: marketCheck } = await admin
        .from('prediction_markets')
        .select('id, status, live_event_id, is_micro_market')
        .eq('id', market_id)
        .maybeSingle()

      if (!marketCheck || !['active', 'trading'].includes(marketCheck.status ?? '')) {
        return NextResponse.json({ error: 'Market not found or not active' }, { status: 404 })
      }

      const allowAnon =
        marketCheck.live_event_id != null || marketCheck.is_micro_market === true
      if (!allowAnon) {
        return NextResponse.json(
          { error: 'Sign up to vote on this market' },
          { status: 401 }
        )
      }

      const { data, error } = await admin.rpc('execute_live_anonymous_market_vote', {
        p_guest_id: sessionId,
        p_market_id: market_id,
        p_outcome_id: outcome_id,
        p_confidence: conf,
      })

      if (error) {
        console.error('Live anonymous vote RPC error:', error)
        return NextResponse.json(
          { error: error.message || 'Vote failed' },
          { status: 400 }
        )
      }

      const result = data as {
        success?: boolean
        already_voted?: boolean
        error?: string
        xp_earned?: number
        outcome_label?: string
        confidence?: number
        new_probability?: number
        is_update?: boolean
        no_change?: boolean
        is_anonymous?: boolean
      }

      if (result.already_voted === true) {
        const res = NextResponse.json({
          success: false,
          alreadyVoted: true,
          error: 'Already voted',
          xp_earned: 0,
          isAnonymous: true,
        })
        res.cookies.set(CC_SESSION, sessionId, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        })
        return res
      }

      if (result.success === false) {
        return NextResponse.json(
          { error: result.error || 'Vote failed' },
          { status: 400 }
        )
      }

      const supabase = await createClient()
      await applySponsoredMicroFundIfNeeded(market_id, supabase)

      const res = NextResponse.json({
        ...result,
        is_update: result.is_update === true,
        no_change: result.no_change === true,
        xp_earned: 0,
        isAnonymous: true,
      })
      res.cookies.set(CC_SESSION, sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      })
      return res
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

    await applySponsoredMicroFundIfNeeded(market_id, supabase)

    return NextResponse.json({
      ...result,
      is_update: result.is_update === true,
      no_change: result.no_change === true,
      isAnonymous: false,
    })
  } catch (err) {
    console.error('Vote route error:', err)
    return NextResponse.json(
      { error: 'Vote failed' },
      { status: 500 }
    )
  }
}
