import { createClient } from '@/lib/supabase-server'
import { MarketsClient } from './MarketsClient'
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

async function getCategoryCounts(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('prediction_markets')
    .select('category')
    .in('status', ['active', 'trading'])

  const counts: Record<string, number> = {}
  for (const m of data ?? []) {
    const cat = m.category || 'other'
    counts[cat] = (counts[cat] || 0) + 1
  }
  return counts
}

async function getResolvedCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('prediction_markets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'resolved')
  return count ?? 0
}

export default async function PredictionsMarketsPage() {
  const [markets, categoryCounts, resolvedCount] = await Promise.all([
    getMarkets(),
    getCategoryCounts(),
    getResolvedCount(),
  ])

  return (
    <MarketsClient
      initialMarkets={markets}
      categoryCounts={categoryCounts}
      resolvedCount={resolvedCount}
    />
  )
}
