import { createClient } from '@/lib/supabase-server'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

const LandingNav = dynamic(() => import('@/app/components/landing/LandingNav'))
const Footer = dynamic(() => import('@/components/Footer'))
const PublicMarketsClient = dynamic(() => import('./PublicMarketsClient'))

async function getMarkets(category?: string): Promise<PredictionMarket[]> {
  const supabase = await createClient()
  let query = supabase
    .from('prediction_markets')
    .select('*')
    .in('status', ['active', 'trading'])
    .order('total_votes', { ascending: false, nullsFirst: false })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Public markets fetch error:', error)
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

async function getHistoryByMarket(): Promise<
  Record<string, { probability: number; recorded_at: string }[]>
> {
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

async function getLeadingOutcomesByMarket(): Promise<
  Record<string, { label: string; probability: number }>
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('market_outcomes')
    .select('market_id, label, probability')
    .order('probability', { ascending: false })

  const byMarket: Record<string, { label: string; probability: number }> = {}
  for (const row of data ?? []) {
    const id = row.market_id
    if (!byMarket[id]) {
      byMarket[id] = { label: row.label, probability: Number(row.probability) }
    }
  }
  return byMarket
}

export default async function PublicMarketsPage() {
  const [markets, categoryCounts, historyByMarket, leadingOutcomes] = await Promise.all([
    getMarkets(),
    getCategoryCounts(),
    getHistoryByMarket(),
    getLeadingOutcomesByMarket(),
  ])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LandingNav />

      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <Suspense fallback={<div className="animate-pulse h-64 bg-slate-900 rounded-xl" />}>
          <PublicMarketsClient
            initialMarkets={markets}
            categoryCounts={categoryCounts}
            historyByMarket={historyByMarket}
            leadingOutcomes={leadingOutcomes}
          />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  )
}
