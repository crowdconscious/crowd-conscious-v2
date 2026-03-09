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
    .order('total_votes', { ascending: false, nullsFirst: false })

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

async function getHistoryByMarket(): Promise<Record<string, { probability: number; recorded_at: string }[]>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('prediction_market_history')
    .select('market_id, probability, recorded_at')
    .order('recorded_at', { ascending: true })

  const byMarket: Record<string, { probability: number; recorded_at: string }[]> = {}
  for (const row of data ?? []) {
    const id = row.market_id
    if (!byMarket[id]) byMarket[id] = []
    byMarket[id].push({ probability: Number(row.probability), recorded_at: row.recorded_at })
  }
  for (const id of Object.keys(byMarket)) {
    byMarket[id] = byMarket[id].slice(-14)
  }
  return byMarket
}

async function getLeadingOutcomesByMarket(): Promise<Record<string, { label: string; probability: number; translations?: unknown }>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('market_outcomes')
    .select('market_id, label, probability, translations')
    .order('probability', { ascending: false })

  const byMarket: Record<string, { label: string; probability: number; translations?: unknown }> = {}
  for (const row of data ?? []) {
    const id = row.market_id
    if (!byMarket[id]) {
      byMarket[id] = {
        label: row.label,
        probability: Number(row.probability),
        translations: (row as { translations?: unknown }).translations,
      }
    }
  }
  return byMarket
}

export default async function PredictionsMarketsPage() {
  const [markets, categoryCounts, resolvedCount, historyByMarket, leadingOutcomes] = await Promise.all([
    getMarkets(),
    getCategoryCounts(),
    getResolvedCount(),
    getHistoryByMarket(),
    getLeadingOutcomesByMarket(),
  ])

  return (
    <MarketsClient
      initialMarkets={markets}
      categoryCounts={categoryCounts}
      resolvedCount={resolvedCount}
      historyByMarket={historyByMarket}
      leadingOutcomes={leadingOutcomes}
    />
  )
}
