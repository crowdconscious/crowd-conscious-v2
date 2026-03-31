import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { LeaderboardClient } from './LeaderboardClient'
import { SITE_URL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: 'Leaderboard — Los Mejores Predictores',
  description:
    'Ranking de los predictores más acertados en Crowd Conscious. Gana XP, sube de nivel y demuestra tu inteligencia colectiva.',
  alternates: {
    canonical: `${SITE_URL}/predictions/leaderboard`,
    languages: {
      'es-MX': `${SITE_URL}/predictions/leaderboard`,
      'en-US': `${SITE_URL}/predictions/leaderboard`,
    },
  },
}

const CATEGORIES = [
  'all',
  'world_cup',
  'world',
  'pulse',
  'government',
  'geopolitics',
  'sustainability',
  'technology',
  'economy',
  'corporate',
  'community',
  'cause',
  'entertainment',
] as const

export type RecentPrediction = {
  market_id: string
  market_title: string
  status: 'correct' | 'incorrect' | 'pending'
}

export type LeaderboardEntry = {
  rank: number
  user_id: string
  username: string
  email: string | null
  avatar_url: string | null
  total_xp: number
  prediction_count: number
  accuracy_pct: number | null
  tier: string
  recent_predictions: RecentPrediction[]
  streak_days: number
  isCurrentUser?: boolean
}

async function getLeaderboardData(category: string) {
  const user = await getCurrentUser()
  const supabase = user ? await createClient() : createAdminClient()

  // Try user_xp first, fallback to user_stats
  let xpRows: { user_id: string; total_xp: number }[] = []

  const { data: xpData } = await supabase
    .from('user_xp')
    .select('user_id, total_xp')
    .gt('total_xp', 0)
    .order('total_xp', { ascending: false })
    .limit(50)

  if (xpData?.length) {
    xpRows = xpData.map((r) => ({ user_id: r.user_id, total_xp: Number(r.total_xp) }))
  } else {
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('user_id, total_xp')
      .gt('total_xp', 0)
      .order('total_xp', { ascending: false })
      .limit(50)
    if (statsData?.length) {
      xpRows = statsData.map((r) => ({ user_id: r.user_id, total_xp: Number(r.total_xp) }))
    }
  }

  if (xpRows.length === 0) {
    return { leaderboard: [], currentUserRank: null }
  }

  const userIds = xpRows.map((r) => r.user_id)

  // Fetch profiles (with email for dedup)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', userIds)

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        full_name: p.full_name || 'Anonymous',
        email: (p as { email?: string }).email ?? null,
        avatar_url: (p as { avatar_url?: string }).avatar_url ?? null,
      },
    ])
  )

  // Deduplicate by email (case-insensitive): keep higher XP
  const byEmail = new Map<string, { user_id: string; total_xp: number }>()
  for (const row of xpRows) {
    const email = profileMap.get(row.user_id)?.email?.toLowerCase().trim()
    const key = email || row.user_id
    const existing = byEmail.get(key)
    if (!existing || row.total_xp > existing.total_xp) {
      byEmail.set(key, row)
    }
  }
  const dedupedRows = Array.from(byEmail.values()).sort((a, b) => b.total_xp - a.total_xp)

  // Fetch votes with market info for recent predictions + category filter
  const { data: votes } = await supabase
    .from('market_votes')
    .select('user_id, market_id, outcome_id, is_correct, xp_earned, bonus_xp, created_at')
    .in('user_id', userIds)
    .eq('is_anonymous', false)
    .order('created_at', { ascending: false })

  const marketIds = [...new Set((votes ?? []).map((v) => v.market_id))]
  const { data: markets } =
    marketIds.length > 0
      ? await supabase
          .from('prediction_markets')
          .select('id, title, category, status')
          .in('id', marketIds)
      : { data: [] }

  const marketMap = new Map((markets ?? []).map((m) => [m.id, m]))

  // Filter by category for XP: when category !== 'all', sum xp only from that category
  const categoryFilter = category && category !== 'all' ? category : null

  const xpByUser = new Map<string, number>()
  const votesByUser = new Map<string, { total: number; resolved: number; correct: number }>()
  const recentByUser = new Map<string, { market_id: string; market_title: string; status: 'correct' | 'incorrect' | 'pending' }[]>()
  const voteDatesByUser = new Map<string, string[]>()

  for (const v of votes ?? []) {
    const m = marketMap.get(v.market_id)
    if (!m) continue

    if (categoryFilter && m.category !== categoryFilter) continue

    const xp = Number(v.xp_earned ?? 0) + Number((v as { bonus_xp?: number }).bonus_xp ?? 0)
    xpByUser.set(v.user_id, (xpByUser.get(v.user_id) ?? 0) + xp)

    if (!votesByUser.has(v.user_id)) {
      votesByUser.set(v.user_id, { total: 0, resolved: 0, correct: 0 })
    }
    const stats = votesByUser.get(v.user_id)!
    stats.total++

    const isResolved = m.status === 'resolved'
    if (isResolved) {
      stats.resolved++
      if (v.is_correct === true) stats.correct++
    }

    const status: 'correct' | 'incorrect' | 'pending' =
      isResolved ? (v.is_correct ? 'correct' : 'incorrect') : 'pending'

    const recent = recentByUser.get(v.user_id) ?? []
    if (recent.length < 3) {
      recent.push({
        market_id: m.id,
        market_title: m.title,
        status,
      })
      recentByUser.set(v.user_id, recent)
    }

    const dates = voteDatesByUser.get(v.user_id) ?? []
    const dateStr = v.created_at?.slice(0, 10)
    if (dateStr && !dates.includes(dateStr)) {
      dates.push(dateStr)
      voteDatesByUser.set(v.user_id, dates.sort().reverse())
    }
  }

  // When category filter: recompute rank by category XP
  const sortedUserIds =
    categoryFilter !== null
      ? [...new Set([...xpByUser.keys(), ...dedupedRows.map((r) => r.user_id)])]
          .sort((a, b) => (xpByUser.get(b) ?? 0) - (xpByUser.get(a) ?? 0))
          .filter((id) => (xpByUser.get(id) ?? 0) > 0)
      : dedupedRows.map((r) => r.user_id)

  const leaderboard: LeaderboardEntry[] = sortedUserIds.slice(0, 25).map((userId, i) => {
    const xp = categoryFilter ? (xpByUser.get(userId) ?? 0) : dedupedRows.find((r) => r.user_id === userId)?.total_xp ?? 0
    const stats = votesByUser.get(userId) || { total: 0, resolved: 0, correct: 0 }
    const accuracy = stats.resolved > 0 ? Math.round((stats.correct / stats.resolved) * 100) : null
    const profile = profileMap.get(userId)
    const fullName = profile?.full_name ?? 'Anonymous'

    const tier =
      xp >= 500
        ? 'legend'
        : xp >= 201
          ? 'champion'
          : xp >= 101
            ? 'hot_streak'
            : xp >= 51
              ? 'rising'
              : 'novice'

    const recent = recentByUser.get(userId) ?? []
    const dates = voteDatesByUser.get(userId) ?? []
    let streak = 0
    if (dates.length > 0) {
      const sorted = [...dates].sort()
      let s = 1
      for (let j = 1; j < sorted.length; j++) {
        const prev = new Date(sorted[j - 1])
        const curr = new Date(sorted[j])
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
        if (diffDays === 1) s++
        else break
      }
      streak = s
    }

    return {
      rank: i + 1,
      user_id: userId,
      username: fullName,
      email: profile?.email ?? null,
      avatar_url: profile?.avatar_url ?? null,
      total_xp: xp,
      prediction_count: stats.total,
      accuracy_pct: accuracy,
      tier,
      recent_predictions: recent,
      streak_days: streak,
    }
  })

  let currentUserRank: LeaderboardEntry | null = null
  if (user) {
    // Ensure current user profile is loaded (may not be in top 50)
    if (!profileMap.has(user.id)) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', user.id)
        .single()
      if (p) {
        profileMap.set(p.id, {
          full_name: p.full_name || 'Anonymous',
          email: (p as { email?: string }).email ?? null,
          avatar_url: (p as { avatar_url?: string }).avatar_url ?? null,
        })
      }
    }
    const idx = leaderboard.findIndex((e) => e.user_id === user.id)
    if (idx >= 0) {
      currentUserRank = { ...leaderboard[idx], isCurrentUser: true }
    } else {
      const myXp = categoryFilter ? xpByUser.get(user.id) ?? 0 : dedupedRows.find((r) => r.user_id === user.id)?.total_xp ?? 0
      if (myXp > 0 || (votesByUser.get(user.id)?.total ?? 0) > 0) {
        const stats = votesByUser.get(user.id) || { total: 0, resolved: 0, correct: 0 }
        const accuracy = stats.resolved > 0 ? Math.round((stats.correct / stats.resolved) * 100) : null
        const profile = profileMap.get(user.id)
        const tier =
          myXp >= 500
            ? 'legend'
            : myXp >= 201
              ? 'champion'
              : myXp >= 101
                ? 'hot_streak'
                : myXp >= 51
                  ? 'rising'
                  : 'novice'
        const rank =
          sortedUserIds.findIndex((id) => id === user.id) + 1 ||
          sortedUserIds.filter((id) => (xpByUser.get(id) ?? 0) > myXp).length + 1

        currentUserRank = {
          rank,
          user_id: user.id,
          username: profile?.full_name ?? 'Anonymous',
          email: profile?.email ?? null,
          avatar_url: profile?.avatar_url ?? null,
          total_xp: myXp,
          prediction_count: stats.total,
          accuracy_pct: accuracy,
          tier,
          recent_predictions: recentByUser.get(user.id) ?? [],
          streak_days: (() => {
        const dates = voteDatesByUser.get(user.id) ?? []
        if (dates.length === 0) return 0
        const sorted = [...dates].sort()
        let s = 1
        for (let j = 1; j < sorted.length; j++) {
          const prev = new Date(sorted[j - 1])
          const curr = new Date(sorted[j])
          if (Math.round((curr.getTime() - prev.getTime()) / 86400000) === 1) s++
              else break
            }
            return s
          })(),
          isCurrentUser: true,
        }
      }
    }
  }

  return {
    leaderboard,
    currentUserRank,
  }
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const category = params.category && CATEGORIES.includes(params.category as (typeof CATEGORIES)[number])
    ? params.category
    : 'all'

  const user = await getCurrentUser()
  const data = await getLeaderboardData(category)

  return (
    <LeaderboardClient
      {...data}
      isAuthenticated={!!user}
      currentCategory={category}
      categories={CATEGORIES.filter((c) => c !== 'all')}
    />
  )
}
