import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

    const supabase = await createClient()

    const { data: votes, error } = await supabase
      .from('market_votes')
      .select('id, market_id, outcome_id, confidence, xp_earned, is_correct, bonus_xp, created_at')
      .eq('user_id', user.id)
      .eq('is_anonymous', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const outcomeIds = [...new Set((votes || []).map((v) => v.outcome_id))]
    const marketIds = [...new Set((votes || []).map((v) => v.market_id))]

    const [outcomesRes, marketsRes] = await Promise.all([
      outcomeIds.length > 0
        ? supabase.from('market_outcomes').select('id, label').in('id', outcomeIds)
        : Promise.resolve({ data: [] }),
      marketIds.length > 0
        ? supabase.from('prediction_markets').select('id, title, status').in('id', marketIds)
        : Promise.resolve({ data: [] }),
    ])

    const outcomesMap = new Map((outcomesRes.data || []).map((o) => [o.id, o.label]))
    const marketsMap = new Map((marketsRes.data || []).map((m) => [m.id, { title: m.title, status: m.status }]))

    const items = (votes || []).map((v) => ({
      id: v.id,
      market_id: v.market_id,
      market_title: marketsMap.get(v.market_id)?.title ?? 'Market',
      market_status: marketsMap.get(v.market_id)?.status ?? 'active',
      outcome_label: outcomesMap.get(v.outcome_id) ?? 'Unknown',
      confidence: v.confidence,
      xp_earned: v.xp_earned,
      bonus_xp: v.bonus_xp ?? 0,
      is_correct: v.is_correct,
      created_at: v.created_at,
    }))

    const { count } = await supabase
      .from('market_votes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_anonymous', false)

    return NextResponse.json({
      items,
      pagination: { total: count ?? items.length, limit, offset },
    })
  } catch (err) {
    console.error('My predictions error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
