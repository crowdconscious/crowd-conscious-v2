import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { PredictionsDashboardClient } from './components/PredictionsDashboardClient'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']
type PredictionPosition = Database['public']['Tables']['prediction_positions']['Row']
type AgentContent = Database['public']['Tables']['agent_content']['Row']

type PositionWithMarket = PredictionPosition & {
  prediction_markets: Pick<PredictionMarket, 'id' | 'title' | 'current_probability' | 'status'> | null
}

async function getDashboardData(userId: string) {
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
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).single(),
    supabase
      .from('prediction_positions')
      .select('*, prediction_markets(id, title, current_probability, status)')
      .eq('user_id', userId)
      .gt('shares', 0),
    supabase
      .from('market_votes')
      .select('id, market_id, outcome_id, confidence, xp_earned, is_correct, bonus_xp')
      .eq('user_id', userId),
    supabase
      .from('prediction_markets')
      .select('*')
      .in('status', ['active', 'trading', 'resolved'])
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
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('conscious_fund').select('current_balance').limit(1).single(),
    supabase
      .from('prediction_trades')
      .select('conscious_fund_amount')
      .eq('user_id', userId),
    supabase.from('user_xp').select('total_xp').eq('user_id', userId).single(),
  ])

  const userName = profile?.full_name || 'Changemaker'
  const userContribution = (userTrades || []).reduce((s, t) => s + Number(t.conscious_fund_amount || 0), 0)
  const fundBalance = Number(fund?.current_balance ?? 0)
  const totalXp = Number(userXp?.total_xp ?? 0)

  const votes = (marketVotes || []) as Array<{
    id: string
    market_id: string
    outcome_id: string
    confidence: number
    xp_earned: number
    is_correct: boolean | null
    bonus_xp: number | null
  }>
  const marketIds = [...new Set(votes.map((v) => v.market_id))]
  const outcomeIds = [...new Set(votes.map((v) => v.outcome_id))]

  let outcomesData: { id: string; label: string }[] = []
  let marketsData: { id: string; title: string; status: string }[] = []
  if (outcomeIds.length > 0) {
    const res = await supabase.from('market_outcomes').select('id, label').in('id', outcomeIds)
    outcomesData = res.data || []
  }
  if (marketIds.length > 0) {
    const res = await supabase.from('prediction_markets').select('id, title, status').in('id', marketIds)
    marketsData = res.data || []
  }

  const outcomesMap = new Map(outcomesData.map((o) => [o.id, o.label]))
  const marketsMap = new Map(marketsData.map((m) => [m.id, { title: m.title, status: m.status }]))

  const userPredictions = votes.map((v) => ({
    id: v.id,
    market_id: v.market_id,
    outcome_label: outcomesMap.get(v.outcome_id) ?? 'Unknown',
    confidence: v.confidence,
    xp_earned: v.xp_earned,
    is_correct: v.is_correct,
    bonus_xp: v.bonus_xp ?? 0,
    market_title: marketsMap.get(v.market_id)?.title ?? 'Market',
    market_status: marketsMap.get(v.market_id)?.status ?? 'active',
  }))

  const resolvedVotes = userPredictions.filter((v) => v.market_status === 'resolved')
  const correctCount = resolvedVotes.filter((v) => v.is_correct === true).length
  const accuracyPct = resolvedVotes.length > 0 ? (correctCount / resolvedVotes.length) * 100 : 0

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
    userName,
    totalXp,
    accuracyPct,
    correctPredictions: correctCount,
    totalResolvedPredictions: resolvedVotes.length,
    userContribution,
    fundBalance,
    positions: enrichedPositions,
    userPredictions,
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
  }
}

export default async function PredictionsDashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getDashboardData(user.id)

  return <PredictionsDashboardClient data={data} />
}
