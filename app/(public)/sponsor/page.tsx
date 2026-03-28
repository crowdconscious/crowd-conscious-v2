import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import dynamic from 'next/dynamic'
import LandingNav from '@/app/components/landing/LandingNav'
import { SponsorPageClient } from './SponsorPageClient'
import { SITE_URL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: {
    absolute: 'Patrocina un Mercado — Tu Marca en el Mundial 2026 | Crowd Conscious',
  },
  description:
    'Patrocina mercados de predicción en Crowd Conscious. 40% al Fondo Consciente. Precios desde $2,000 MXN. Mundial 2026 en Ciudad de México.',
  openGraph: {
    title: 'Crowd Conscious para Marcas — Activación con Propósito',
    description:
      'Patrocina mercados de predicciones. Cada voto genera impacto comunitario. Tu marca, tu causa, tu audiencia.',
    url: `${SITE_URL}/sponsor`,
  },
  alternates: {
    canonical: `${SITE_URL}/sponsor`,
    languages: {
      'es-MX': `${SITE_URL}/sponsor`,
      'en-US': `${SITE_URL}/sponsor`,
    },
  },
}

const Footer = dynamic(() => import('@/components/Footer'))

async function getMarkets() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prediction_markets')
    .select('id, title, category, current_probability, total_votes, sponsor_name, sponsor_logo_url, sponsor_url')
    .in('status', ['active', 'trading'])
    .order('total_votes', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Sponsor page markets fetch error:', error)
    return { unsponsored: [], sponsored: [] }
  }

  const unsponsored = (data || []).filter((m) => !m.sponsor_name)
  const sponsored = (data || []).filter((m) => m.sponsor_name)

  return { unsponsored, sponsored }
}

async function getLeadingOutcomes(marketIds: string[]) {
  if (marketIds.length === 0) return {}
  const supabase = await createClient()
  const { data } = await supabase
    .from('market_outcomes')
    .select('market_id, label, probability')
    .in('market_id', marketIds)
    .order('probability', { ascending: false })

  const byMarket: Record<string, { label: string; probability: number }> = {}
  for (const row of data ?? []) {
    if (!byMarket[row.market_id]) {
      byMarket[row.market_id] = { label: row.label, probability: Number(row.probability) }
    }
  }
  return byMarket
}

export default async function SponsorPage() {
  const { unsponsored, sponsored } = await getMarkets()
  const marketIds = [...unsponsored, ...sponsored].map((m) => m.id)
  const leadingOutcomes = await getLeadingOutcomes(marketIds)

  return (
    <div className="min-h-screen bg-cc-bg text-cc-text-primary">
      <LandingNav />
      <SponsorPageClient
        unsponsored={unsponsored}
        sponsored={sponsored}
        leadingOutcomes={leadingOutcomes}
      />
      <Footer />
    </div>
  )
}
