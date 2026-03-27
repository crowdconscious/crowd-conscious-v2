import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { MarketsClient } from './MarketsClient'
import type { Database } from '@/types/database'
import { SITE_URL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: 'Todos los Mercados — Predicciones',
  description:
    'Lista completa de mercados de predicción en Crowd Conscious: filtra por categoría, ordena por actividad o cierre.',
  alternates: {
    canonical: `${SITE_URL}/predictions/markets`,
    languages: {
      'es-MX': `${SITE_URL}/predictions/markets`,
      'en-US': `${SITE_URL}/predictions/markets`,
    },
  },
}

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row'] & {
  recent_votes?: number
}

const VALID_CATEGORIES = ['world', 'world_cup', 'government', 'sustainability', 'corporate', 'community', 'cause']

async function getMarkets(sort: string = 'active', category: string = 'all'): Promise<PredictionMarket[]> {
  const supabase = await createClient()
  let query = supabase
    .from('prediction_markets')
    .select('*')
    .in('status', ['active', 'trading'])

  if (category && category !== 'all' && VALID_CATEGORIES.includes(category)) {
    query = query.eq('category', category)
  }

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'closing') {
    query = query.gt('resolution_date', new Date().toISOString()).order('resolution_date', { ascending: true })
  } else {
    query = query.order('engagement_count', { ascending: false, nullsFirst: false })
  }

  const { data, error } = await query

  if (error) {
    console.error('Predictions markets fetch error:', error)
    return []
  }

  return (data || []) as PredictionMarket[]
}

async function getTrendingMarkets(): Promise<PredictionMarket[]> {
  const supabase = await createClient()
  const { data: markets } = await supabase
    .from('prediction_markets')
    .select('*')
    .in('status', ['active', 'trading'])
    .limit(50)

  if (!markets?.length) return []

  const marketIds = markets.map((m) => m.id)
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const [recentVotesRes, totalVotesRes, commentCountRes] = await Promise.all([
    supabase.from('market_votes').select('market_id').in('market_id', marketIds).gte('created_at', twoDaysAgo),
    supabase.from('market_votes').select('market_id').in('market_id', marketIds),
    supabase.from('market_comments').select('market_id').in('market_id', marketIds),
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
    return { ...m, recent_votes: recentVotes, heatScore: activityScore + urgencyBonus }
  })
  scored.sort((a, b) => (b.heatScore ?? 0) - (a.heatScore ?? 0))
  return scored.slice(0, 5).map(({ heatScore, ...m }) => ({ ...m, recent_votes: m.recent_votes })) as PredictionMarket[]
}

async function getQuickMarkets(): Promise<{ markets: PredictionMarket[]; label: string }> {
  const supabase = await createClient()
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: soon30 } = await supabase
    .from('prediction_markets')
    .select('*')
    .in('status', ['active', 'trading'])
    .lte('resolution_date', in30Days)
    .gt('resolution_date', new Date().toISOString())
    .order('resolution_date', { ascending: true })
    .limit(5)

  if (soon30?.length) {
    return { markets: soon30 as PredictionMarket[], label: 'Quick Predictions' }
  }

  const { data: soon90 } = await supabase
    .from('prediction_markets')
    .select('*')
    .in('status', ['active', 'trading'])
    .lte('resolution_date', in90Days)
    .gt('resolution_date', new Date().toISOString())
    .order('resolution_date', { ascending: true })
    .limit(5)

  return { markets: (soon90 || []) as PredictionMarket[], label: 'Próximas en resolverse' }
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

export default async function PredictionsMarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; category?: string }>
}) {
  const params = await searchParams
  const sort = params.sort || 'active'
  const category = params.category || 'all'

  const [markets, trendingMarkets, quickMarkets, categoryCounts, resolvedCount, historyByMarket, leadingOutcomes] =
    await Promise.all([
      getMarkets(sort, category),
      getTrendingMarkets(),
      getQuickMarkets(),
      getCategoryCounts(),
      getResolvedCount(),
      getHistoryByMarket(),
      getLeadingOutcomesByMarket(),
    ])

  return (
    <MarketsClient
      initialMarkets={markets}
      trendingMarkets={trendingMarkets}
      quickMarkets={quickMarkets}
      categoryCounts={categoryCounts}
      resolvedCount={resolvedCount}
      historyByMarket={historyByMarket}
      leadingOutcomes={leadingOutcomes}
      initialCategory={category}
      initialSort={sort}
    />
  )
}
