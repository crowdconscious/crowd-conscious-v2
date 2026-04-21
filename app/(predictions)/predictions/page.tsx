import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { PredictionsDashboardClient } from './components/PredictionsDashboardClient'
import { lookupSponsorAccountsForUser } from '@/lib/sponsor-account-lookup'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']
type PredictionPosition = Database['public']['Tables']['prediction_positions']['Row']
type AgentContent = Database['public']['Tables']['agent_content']['Row']

type PositionWithMarket = PredictionPosition & {
  prediction_markets: Pick<PredictionMarket, 'id' | 'title' | 'current_probability' | 'status'> | null
}

async function getDashboardData(userId: string, isAdmin: boolean) {
  const supabase = await createClient()

  const [
    { data: profile },
    { data: positions },
    { data: marketVotes },
    { data: markets },
    { data: history },
    { data: agentContent },
    { data: fund },
    { data: userTrades },
    { data: userXp },
    { data: userStats },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).single(),
    supabase
      .from('prediction_positions')
      .select('*, prediction_markets(id, title, current_probability, status)')
      .eq('user_id', userId)
      .gt('shares', 0),
    supabase
      .from('market_votes')
      .select('id, market_id, outcome_id, confidence, xp_earned, is_correct, bonus_xp, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('prediction_markets')
      .select('*')
      .in('status', ['active', 'trading', 'resolved'])
      .is('archived_at', null)
      .order('total_votes', { ascending: false, nullsFirst: false }),
    supabase
      .from('prediction_market_history')
      .select('market_id, probability, recorded_at')
      .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: true }),
    supabase
      .from('agent_content')
      .select('*')
      .eq('published', true)
      .is('archived_at', null)
      .eq('content_type', 'news_summary')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('conscious_fund').select('current_balance').limit(1).single(),
    supabase
      .from('xp_transactions')
      .select('amount')
      .eq('user_id', userId)
      .in('action_type', ['prediction_vote', 'prediction_correct']),
    supabase.from('user_xp').select('total_xp').eq('user_id', userId).single(),
    supabase
      .from('user_stats')
      .select('current_streak, last_activity')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const userName = profile?.full_name || 'Changemaker'
  const userImpactXp = (userTrades ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const fundBalance = Number(fund?.current_balance ?? 0)
  const totalXp = Number(userXp?.total_xp ?? 0)
  const currentStreak = Number(userStats?.current_streak ?? 0)
  const lastActivityAt = userStats?.last_activity as string | null
  const lastActivityMs = lastActivityAt ? new Date(lastActivityAt).getTime() : 0

  const votes = (marketVotes || []) as Array<{
    id: string
    market_id: string
    outcome_id: string
    confidence: number
    xp_earned: number
    is_correct: boolean | null
    bonus_xp: number | null
    created_at: string
  }>
  const marketIds = [...new Set(votes.map((v) => v.market_id))]
  const outcomeIds = [...new Set(votes.map((v) => v.outcome_id))]

  let outcomesData: { id: string; label: string }[] = []
  let marketsData: { id: string; title: string; status: string; resolved_at: string | null }[] = []
  if (outcomeIds.length > 0) {
    const res = await supabase.from('market_outcomes').select('id, label').in('id', outcomeIds)
    outcomesData = res.data || []
  }
  if (marketIds.length > 0) {
    const res = await supabase
      .from('prediction_markets')
      .select('id, title, status, resolved_at')
      .in('id', marketIds)
    marketsData = res.data || []
  }

  const outcomesMap = new Map(outcomesData.map((o) => [o.id, o.label]))
  const marketsMap = new Map(
    marketsData.map((m) => [
      m.id,
      { title: m.title, status: m.status, resolved_at: m.resolved_at },
    ])
  )

  const userPredictions = votes.map((v) => {
    const info = marketsMap.get(v.market_id)
    return {
      id: v.id,
      market_id: v.market_id,
      outcome_label: outcomesMap.get(v.outcome_id) ?? 'Unknown',
      confidence: v.confidence,
      xp_earned: v.xp_earned,
      is_correct: v.is_correct,
      bonus_xp: v.bonus_xp ?? 0,
      voted_at: v.created_at,
      market_title: info?.title ?? 'Market',
      market_status: info?.status ?? 'active',
      resolved_at: info?.resolved_at ?? null,
    }
  })

  const resolvedVotes = userPredictions.filter((v) => v.market_status === 'resolved')
  const correctCount = resolvedVotes.filter((v) => v.is_correct === true).length
  const accuracyPct = resolvedVotes.length > 0 ? (correctCount / resolvedVotes.length) * 100 : 0

  // Predictions resolved in the last 7 days where the user voted — feeds
  // the "your attention" banner above the predictions list.
  const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentlyResolvedForUser = userPredictions.filter(
    (v) =>
      v.market_status === 'resolved' &&
      v.resolved_at !== null &&
      new Date(v.resolved_at).getTime() >= sevenDaysAgoMs
  )

  const positionsWithMarket = (positions || []) as PositionWithMarket[]
  const activePositions = positionsWithMarket.filter(
    (p) => p.prediction_markets && p.prediction_markets.status !== 'resolved'
  )

  let portfolioValue = 0
  let totalCostBasis = 0
  const enrichedPositions = activePositions.map((p) => {
    const shares = Number(p.shares)
    const avgPrice = Number(p.average_price) || 0.5
    const prob = Number(p.prediction_markets?.current_probability ?? 50)
    const isYes = p.side === 'yes'

    const costBasis = shares * avgPrice * 10
    const currentPriceMxn = isYes ? (prob / 100) * 10 : ((100 - prob) / 100) * 10
    const currentValue = shares * currentPriceMxn
    const pnl = currentValue - costBasis
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0

    portfolioValue += currentValue
    totalCostBasis += costBasis

    return {
      ...p,
      costBasis,
      currentValue,
      pnl,
      pnlPct,
      currentPriceMxn,
    }
  })

  const totalPnl = portfolioValue - totalCostBasis
  const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : (portfolioValue > 0 ? 100 : 0)

  const historyByMarket = (history || []).reduce(
    (acc, h) => {
      const id = h.market_id
      if (!acc[id]) acc[id] = []
      acc[id].push({ probability: Number(h.probability), recorded_at: h.recorded_at })
      return acc
    },
    {} as Record<string, { probability: number; recorded_at: string }[]>
  )

  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  // Latest vote timestamp per market — powers the activity dot in the
  // redesigned Market Overview list. One query grabbing the most recent
  // 500 votes across all shown markets is plenty for a dashboard with
  // ~8-20 active markets at a time.
  const shownMarketIds = (markets ?? []).slice(0, 20).map((m) => m.id)
  const lastVoteByMarket = new Map<string, number>()
  if (shownMarketIds.length > 0) {
    const { data: recentVoteRows } = await supabase
      .from('market_votes')
      .select('market_id, created_at')
      .in('market_id', shownMarketIds)
      .order('created_at', { ascending: false })
      .limit(500)
    for (const row of recentVoteRows ?? []) {
      const ts = new Date(row.created_at as string).getTime()
      const existing = lastVoteByMarket.get(row.market_id as string) ?? 0
      if (ts > existing) lastVoteByMarket.set(row.market_id as string, ts)
    }
  }

  // Admin-only attention counts. Only run the queries if the caller is
  // admin — regular users don't need these.
  let draftBlogCount = 0
  let pendingMarketSuggestions = 0
  if (isAdmin) {
    const [{ count: blogCount }, { data: suggestionRows }] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
      supabase
        .from('agent_content')
        .select('id, content_type, metadata, published')
        .in('content_type', ['market_suggestion', 'market_insight'])
        .eq('published', false),
    ])
    draftBlogCount = blogCount ?? 0
    pendingMarketSuggestions = (suggestionRows ?? []).filter((row) => {
      if (row.content_type === 'market_suggestion') return true
      const metaType = (row.metadata as { type?: string } | null)?.type
      return row.content_type === 'market_insight' && metaType === 'market_suggestion'
    }).length
  }

  const biggestMovers = (markets || [])
    .filter((m) => m.status !== 'resolved')
    .map((m) => {
      const hist = historyByMarket[m.id] || []
      const recent = hist.filter((h) => new Date(h.recorded_at).getTime() >= oneDayAgo)
      const old = hist.filter((h) => new Date(h.recorded_at).getTime() < oneDayAgo)
      const newProb = Number(m.current_probability)
      const oldProb = old.length > 0 ? old[old.length - 1].probability : newProb
      const delta = newProb - oldProb
      return { market: m, oldProb, newProb, delta }
    })
    .filter((x) => Math.abs(x.delta) > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3)

  const newMarkets = (markets || []).filter(
    (m) => new Date(m.created_at).getTime() >= sevenDaysAgo && m.status !== 'resolved'
  )

  return {
    userId,
    userName,
    isAdmin,
    totalXp,
    accuracyPct,
    correctPredictions: correctCount,
    totalResolvedPredictions: resolvedVotes.length,
    userImpactXp,
    fundBalance,
    currentStreak,
    lastActivityMs,
    positions: enrichedPositions,
    userPredictions,
    recentlyResolvedForUser,
    biggestMovers: biggestMovers.map((x) => ({
      ...x.market,
      oldProb: x.oldProb,
      newProb: x.newProb,
      delta: x.delta,
    })),
    newMarkets,
    agentContent: (agentContent || []) as AgentContent[],
    allMarkets: (markets || []) as PredictionMarket[],
    historyByMarket,
    lastVoteByMarket: Object.fromEntries(lastVoteByMarket),
    draftBlogCount,
    pendingMarketSuggestions,
  }
}

export default async function PredictionsDashboardPage() {
  const user = await getCurrentUser()
  // Anonymous users get the public market explorer (where guest voting works)
  // instead of a login wall. Personal dashboard requires an account.
  if (!user) redirect('/predictions/markets')

  const isAdmin = (user as { user_type?: string } | null)?.user_type === 'admin'
  // Run the sponsor lookup in parallel with the main dashboard data.
  // One extra round trip, amortized into the Promise.all: coupon redeemers
  // see a first-class "go to my sponsor dashboard" CTA the moment they
  // land here instead of having to guess where it lives.
  const [data, sponsorSummary] = await Promise.all([
    getDashboardData(user.id, isAdmin),
    lookupSponsorAccountsForUser(user),
  ])

  const sponsorCta = sponsorSummary.count > 0
    ? {
        count: sponsorSummary.count,
        primaryToken: sponsorSummary.primary?.access_token ?? null,
        primaryCompany: sponsorSummary.primary?.company_name ?? null,
        isPulseClient: sponsorSummary.primary?.is_pulse_client ?? null,
      }
    : null

  return <PredictionsDashboardClient data={data} sponsorCta={sponsorCta} />
}
