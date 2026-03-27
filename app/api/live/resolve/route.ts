import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { market_id, winning_outcome_id } = body

    if (!market_id || !winning_outcome_id) {
      return NextResponse.json(
        { error: 'market_id and winning_outcome_id are required' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const { data: marketBefore } = await admin
      .from('prediction_markets')
      .select('live_event_id, total_votes, engagement_count')
      .eq('id', market_id)
      .maybeSingle()

    const voteCount = Number(marketBefore?.total_votes ?? marketBefore?.engagement_count ?? 0)

    const { data, error } = await admin.rpc('resolve_market_free', {
      p_market_id: market_id,
      p_winning_outcome_id: winning_outcome_id,
    })

    if (error) {
      console.error('[POST /api/live/resolve] rpc', error)
      return NextResponse.json({ error: error.message || 'Resolution failed' }, { status: 400 })
    }

    const result = data as {
      success?: boolean
      error?: string
      total_voters?: number
      correct_voters?: number
      winning_outcome?: string
    }

    if (result.success === false) {
      return NextResponse.json({ error: result.error || 'Resolution failed' }, { status: 400 })
    }

    const liveEventId = marketBefore?.live_event_id as string | null | undefined
    if (liveEventId) {
      const { data: evRow } = await admin
        .from('live_events')
        .select('total_votes_cast')
        .eq('id', liveEventId)
        .single()

      const nextTotal = (evRow?.total_votes_cast ?? 0) + voteCount
      await admin.from('live_events').update({ total_votes_cast: nextTotal }).eq('id', liveEventId)
    }

    return NextResponse.json({
      success: true,
      total_voters: result.total_voters ?? 0,
      correct_voters: result.correct_voters ?? 0,
      winning_outcome: result.winning_outcome ?? null,
    })
  } catch (e) {
    console.error('[POST /api/live/resolve]', e)
    return NextResponse.json({ error: 'Resolution failed' }, { status: 500 })
  }
}
