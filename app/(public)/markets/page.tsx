import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import dynamic from 'next/dynamic'
import LandingNav from '@/app/components/landing/LandingNav'
import { Suspense } from 'react'
import type { Database } from '@/types/database'
import { SITE_URL } from '@/lib/seo/site'
import type { MarketCardOutcome } from '@/components/MarketCard'

export const metadata: Metadata = {
  title: {
    absolute:
      'Mercados de Predicción — Deportes, Política, Mundial 2026 | Crowd Conscious',
  },
  description:
    'Explora mercados activos sobre deportes, política, Mundial 2026 y más. Vota gratis y sigue las probabilidades en tiempo real.',
  alternates: {
    canonical: `${SITE_URL}/markets`,
    languages: {
      'es-MX': `${SITE_URL}/markets`,
      'en-US': `${SITE_URL}/markets`,
    },
  },
}

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

const Footer = dynamic(() => import('@/components/Footer'))
const PublicMarketsClient = dynamic(() => import('./PublicMarketsClient'))

async function getMarkets(category?: string): Promise<PredictionMarket[]> {
  const supabase = await createClient()
  let query = supabase
    .from('prediction_markets')
    .select('*')
    .in('status', ['active', 'trading'])
    .is('archived_at', null)
    .eq('is_draft', false)
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
    .is('archived_at', null)
    .eq('is_draft', false)

  const counts: Record<string, number> = {}
  for (const m of data ?? []) {
    const cat = m.category || 'other'
    counts[cat] = (counts[cat] || 0) + 1
  }
  return counts
}

async function getOutcomesGrouped(): Promise<Record<string, MarketCardOutcome[]>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('market_outcomes')
    .select('id, market_id, label, probability, sort_order, translations')
    .order('probability', { ascending: false })

  const out: Record<string, MarketCardOutcome[]> = {}
  for (const r of data ?? []) {
    const row = r as {
      id: string
      market_id: string
      label: string
      probability: number
      sort_order: number | null
      translations?: unknown
    }
    const mid = row.market_id
    if (!out[mid]) out[mid] = []
    out[mid].push({
      id: row.id,
      label: row.label,
      probability: Number(row.probability),
      sort_order: row.sort_order ?? 0,
      translations: row.translations,
    })
  }
  for (const id of Object.keys(out)) {
    out[id].sort((a, b) => b.probability - a.probability)
  }
  return out
}

export default async function PublicMarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ sponsor_mode?: string; token?: string }>
}) {
  const sp = await searchParams
  const sponsorMode = sp.sponsor_mode === 'true' || sp.sponsor_mode === '1'
  const sponsorToken = typeof sp.token === 'string' ? sp.token : ''

  const [markets, categoryCounts, outcomesByMarketId] = await Promise.all([
    getMarkets(),
    getCategoryCounts(),
    getOutcomesGrouped(),
  ])

  return (
    <div className="min-h-screen bg-cc-bg text-cc-text-primary">
      <LandingNav />

      <main className="pb-16 pt-24">
        <div className="mx-auto max-w-7xl px-4">
          <Suspense
            fallback={<div className="h-64 animate-pulse rounded-xl bg-cc-card/80" />}
          >
            <PublicMarketsClient
              initialMarkets={markets}
              categoryCounts={categoryCounts}
              outcomesByMarketId={outcomesByMarketId}
              sponsorMode={sponsorMode}
              sponsorToken={sponsorToken}
            />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  )
}
