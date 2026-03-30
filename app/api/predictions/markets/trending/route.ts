import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row'] & {
  recent_votes?: number
  total_votes_count?: number
  comment_count?: number
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: markets } = await supabase
      .from('prediction_markets')
      .select('*')
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .limit(50)

    if (!markets?.length) {
      return NextResponse.json({ markets: [] })
    }

    const marketIds = markets.map((m) => m.id)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const [recentVotesRes, totalVotesRes, commentCountRes] = await Promise.all([
      supabase
        .from('market_votes')
        .select('market_id')
        .in('market_id', marketIds)
        .gte('created_at', twoDaysAgo),
      supabase.from('market_votes').select('market_id').in('market_id', marketIds),
      supabase
        .from('market_comments')
        .select('market_id')
        .in('market_id', marketIds),
    ])

    const recentByMarket: Record<string, number> = {}
    for (const r of recentVotesRes.data ?? []) {
      recentByMarket[r.market_id] = (recentByMarket[r.market_id] ?? 0) + 1
    }
    const totalByMarket: Record<string, number> = {}
    for (const r of totalVotesRes.data ?? []) {
      totalByMarket[r.market_id] = (totalByMarket[r.market_id] ?? 0) + 1
    }
    const commentsByMarket: Record<string, number> = {}
    for (const r of commentCountRes.data ?? []) {
      commentsByMarket[r.market_id] = (commentsByMarket[r.market_id] ?? 0) + 1
    }

    const now = new Date()
    const scored = markets.map((m) => {
      const recentVotes = recentByMarket[m.id] ?? 0
      const totalVotes = totalByMarket[m.id] ?? Number((m as { total_votes?: number }).total_votes) ?? 0
      const commentCount = commentsByMarket[m.id] ?? 0
      const resolutionDate = new Date(m.resolution_date)
      const daysToResolve = Math.ceil((resolutionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      const urgencyBonus = daysToResolve < 30 ? 50 : daysToResolve < 90 ? 20 : 0
      const activityScore = recentVotes * 10 + totalVotes * 2 + commentCount * 3
      const heatScore = activityScore + urgencyBonus

      return {
        ...m,
        recent_votes: recentVotes,
        total_votes_count: totalVotes,
        comment_count: commentCount,
        heatScore,
      }
    })

    scored.sort((a, b) => (b.heatScore ?? 0) - (a.heatScore ?? 0))
    const trending = scored.slice(0, 5).map(({ heatScore, ...m }) => m)

    return NextResponse.json({ markets: trending as PredictionMarket[] })
  } catch (err) {
    console.error('Trending markets error:', err)
    return NextResponse.json({ error: 'Failed to fetch trending markets' }, { status: 500 })
  }
}
