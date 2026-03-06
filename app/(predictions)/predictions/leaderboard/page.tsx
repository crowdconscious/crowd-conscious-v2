import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { LeaderboardClient } from './LeaderboardClient'

async function getLeaderboardData() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  const { data: xpRows, error: xpError } = await supabase
    .from('user_xp')
    .select('user_id, total_xp')
    .gt('total_xp', 0)
    .order('total_xp', { ascending: false })
    .limit(25)

  if (xpError || !xpRows?.length) {
    return { leaderboard: [], currentUserRank: null }
  }

  const userIds = xpRows.map((r) => r.user_id)

  const [profilesRes, votesRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', userIds),
    supabase
      .from('market_votes')
      .select('user_id, market_id, is_correct')
      .in('user_id', userIds),
  ])

  const marketIds = [...new Set((votesRes.data ?? []).map((v) => v.market_id))]
  const { data: markets } =
    marketIds.length > 0
      ? await supabase
          .from('prediction_markets')
          .select('id, status')
          .in('id', marketIds)
      : { data: [] }

  const marketStatus = new Map((markets ?? []).map((m) => [m.id, m.status]))
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name || 'Anonymous'])
  )

  const votesByUser = new Map<string, { total: number; resolved: number; correct: number }>()
  for (const v of votesRes.data ?? []) {
    if (!votesByUser.has(v.user_id)) {
      votesByUser.set(v.user_id, { total: 0, resolved: 0, correct: 0 })
    }
    const entry = votesByUser.get(v.user_id)!
    entry.total++
    const status = marketStatus.get(v.market_id)
    if (status === 'resolved') {
      entry.resolved++
      if (v.is_correct === true) entry.correct++
    }
  }

  type LeaderboardEntry = {
    rank: number
    user_id: string
    username: string
    total_xp: number
    prediction_count: number
    accuracy_pct: number | null
    isCurrentUser?: boolean
  }

  const leaderboard: LeaderboardEntry[] = xpRows.slice(0, 20).map((row, i) => {
    const stats = votesByUser.get(row.user_id) || {
      total: 0,
      resolved: 0,
      correct: 0,
    }
    const accuracy =
      stats.resolved > 0 ? Math.round((stats.correct / stats.resolved) * 100) : null

    return {
      rank: i + 1,
      user_id: row.user_id,
      username: profileMap.get(row.user_id) || 'Anonymous',
      total_xp: Number(row.total_xp),
      prediction_count: stats.total,
      accuracy_pct: accuracy,
    }
  })

  let currentUserRank: LeaderboardEntry | null = null
  if (user) {
    const idx = leaderboard.findIndex((e) => e.user_id === user.id)
    if (idx >= 0) {
      currentUserRank = { ...leaderboard[idx], isCurrentUser: true }
    } else {
      const userXp = xpRows.find((r) => r.user_id === user.id)
      if (userXp) {
        const rank =
          xpRows.filter((r) => Number(r.total_xp) > Number(userXp.total_xp)).length + 1
        const stats = votesByUser.get(user.id) || {
          total: 0,
          resolved: 0,
          correct: 0,
        }
        const accuracy =
          stats.resolved > 0 ? Math.round((stats.correct / stats.resolved) * 100) : null
        currentUserRank = {
          rank,
          user_id: user.id,
          username: profileMap.get(user.id) || 'Anonymous',
          total_xp: Number(userXp.total_xp),
          prediction_count: stats.total,
          accuracy_pct: accuracy,
          isCurrentUser: true,
        }
      }
    }
  }

  return { leaderboard, currentUserRank }
}

export default async function LeaderboardPage() {
  const data = await getLeaderboardData()
  return <LeaderboardClient {...data} />
}
