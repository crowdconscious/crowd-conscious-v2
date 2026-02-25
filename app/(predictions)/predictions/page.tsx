import { createClient } from '@/lib/supabase-server'
import { PredictionsDashboardClient } from './components/PredictionsDashboardClient'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

async function getMarkets(): Promise<PredictionMarket[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prediction_markets')
    .select('*')
    .in('status', ['active', 'trading'])
    .order('total_volume', { ascending: false })

  if (error) {
    console.error('Predictions markets fetch error:', error)
    return []
  }

  return (data || []) as PredictionMarket[]
}

async function getStats() {
  const supabase = await createClient()

  const [marketsRes, fundRes] = await Promise.all([
    supabase
      .from('prediction_markets')
      .select('id, total_volume, category')
      .in('status', ['active', 'trading']),
    supabase
      .from('conscious_fund')
      .select('current_balance, total_disbursed')
      .limit(1)
      .single(),
  ])

  const markets = marketsRes.data || []
  const totalMarkets = markets.length
  const totalVolume = markets.reduce(
    (sum, m) => sum + (Number(m.total_volume) || 0),
    0
  )
  const fundBalance = fundRes.data?.current_balance ?? 0
  const grantsAwarded = fundRes.data?.total_disbursed ?? 0

  const categoryCounts = markets.reduce(
    (acc, m) => {
      const cat = m.category || 'other'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return {
    totalMarketsActive: totalMarkets,
    totalVolume,
    consciousFundBalance: Number(fundBalance),
    grantsAwarded: Number(grantsAwarded),
    categoryCounts,
  }
}

export default async function PredictionsDashboardPage() {
  const [markets, stats] = await Promise.all([getMarkets(), getStats()])

  return (
    <PredictionsDashboardClient
      initialMarkets={markets}
      initialStats={stats}
    />
  )
}
