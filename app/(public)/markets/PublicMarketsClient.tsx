'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Globe,
  Building2,
  Briefcase,
  Users,
  Heart,
  Trophy,
  Leaf,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { MarketCard } from '@/components/MarketCard'
import type { MarketCardOutcome } from '@/components/MarketCard'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

const CATEGORIES = [
  { id: 'all', labelEs: 'Todos', labelEn: 'All', icon: Globe },
  { id: 'world_cup', labelEs: 'Mundial', labelEn: 'World Cup', icon: Trophy },
  { id: 'world', labelEs: 'Mundo', labelEn: 'World', icon: Globe },
  { id: 'government', labelEs: 'Gobierno', labelEn: 'Government', icon: Building2 },
  { id: 'sustainability', labelEs: 'Sostenibilidad', labelEn: 'Sustainability', icon: Leaf },
  { id: 'corporate', labelEs: 'Corporativo', labelEn: 'Corporate', icon: Briefcase },
  { id: 'community', labelEs: 'Comunidad', labelEn: 'Community', icon: Users },
  { id: 'cause', labelEs: 'Causa', labelEn: 'Cause', icon: Heart },
] as const

interface Props {
  initialMarkets: PredictionMarket[]
  categoryCounts: Record<string, number>
  outcomesByMarketId: Record<string, MarketCardOutcome[]>
}

export default function PublicMarketsClient({
  initialMarkets,
  categoryCounts,
  outcomesByMarketId,
}: Props) {
  const { language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const searchParams = useSearchParams()
  const categoryFromUrl = searchParams.get('category') || 'all'
  const [markets, setMarkets] = useState<PredictionMarket[]>(initialMarkets)
  const [category, setCategory] = useState<string>(categoryFromUrl)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setCategory(categoryFromUrl)
  }, [categoryFromUrl])
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchMarkets = useCallback(async () => {
    setSearching(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.set('category', category)
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await fetch(`/api/markets?${params}`)
      const data = await res.json()
      if (data.markets) setMarkets(data.markets)
    } catch (err) {
      console.error('Fetch markets error:', err)
    } finally {
      setSearching(false)
    }
  }, [category, debouncedSearch])

  useEffect(() => {
    if (debouncedSearch || category !== 'all') {
      fetchMarkets()
    } else {
      setMarkets(initialMarkets)
    }
  }, [debouncedSearch, category, initialMarkets, fetchMarkets])

  const catLabel = (c: (typeof CATEGORIES)[number]) => (locale === 'es' ? c.labelEs : c.labelEn)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">
          {locale === 'es' ? 'Explorar mercados' : 'Browse markets'}
        </h1>
        <p className="mt-1 text-cc-text-secondary">
          {locale === 'es'
            ? 'Predice sobre lo que importa. Regístrate gratis y gana XP.'
            : 'Predict on what matters. Sign up free to start earning XP.'}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cc-text-muted" />
        <input
          type="search"
          placeholder={locale === 'es' ? 'Buscar mercados…' : 'Search markets…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-cc-border bg-cc-card py-3 pl-10 pr-4 text-white placeholder:text-cc-text-muted focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
        <div className="flex min-w-max gap-2 pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const count =
              cat.id === 'all'
                ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
                : categoryCounts[cat.id] || 0
            const isActive = category === cat.id

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`
                  flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'border border-cc-border bg-cc-card text-cc-text-secondary hover:border-gray-600 hover:text-white'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {catLabel(cat)}
                <span
                  className={`ml-1 rounded px-1.5 py-0.5 text-xs ${
                    isActive ? 'bg-white/20' : 'bg-gray-800/80'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {searching ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-cc-border bg-cc-card p-5">
              <div className="mb-4 h-6 w-1/3 rounded bg-gray-800" />
              <div className="mb-4 h-12 rounded bg-gray-800" />
              <div className="h-4 w-2/3 rounded bg-gray-800" />
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="py-16 text-center text-cc-text-secondary">
          <p className="text-lg">{locale === 'es' ? 'No hay mercados' : 'No markets found'}</p>
          <p className="mt-2 text-sm">
            {search || category !== 'all'
              ? locale === 'es'
                ? 'Prueba otro filtro o búsqueda'
                : 'Try adjusting your search or filters'
              : locale === 'es'
                ? 'Los mercados aparecerán cuando estén activos'
                : 'Markets will appear here when they are active'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              outcomes={outcomesByMarketId[market.id] ?? []}
              publicPredictCta
            />
          ))}
        </div>
      )}

      <div className="pt-8 text-center">
        <Link
          href="/signup"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 font-semibold text-white transition-colors hover:bg-emerald-400"
        >
          {locale === 'es' ? 'Regístrate para predecir' : 'Sign up to predict'}
        </Link>
      </div>
    </div>
  )
}
