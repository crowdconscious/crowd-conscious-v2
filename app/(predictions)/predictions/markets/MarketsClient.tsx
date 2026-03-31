'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Globe,
  Building2,
  Briefcase,
  Users,
  Heart,
  Trophy,
  Leaf,
  BarChart3,
  Map,
  Cpu,
  TrendingUp,
  Clapperboard,
  Flame,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { MarketCard } from '../components/MarketCard'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row'] & { recent_votes?: number }

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'world_cup', label: 'World Cup', icon: Trophy },
  { id: 'world', label: 'World', icon: Globe },
  { id: 'pulse', label: 'Pulse', icon: BarChart3 },
  { id: 'government', label: 'Government', icon: Building2 },
  { id: 'geopolitics', label: 'Geopolitics', icon: Map },
  { id: 'sustainability', label: 'Sustainability', icon: Leaf },
  { id: 'technology', label: 'Technology', icon: Cpu },
  { id: 'economy', label: 'Economy', icon: TrendingUp },
  { id: 'corporate', label: 'Corporate', icon: Briefcase },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'cause', label: 'Cause', icon: Heart },
  { id: 'entertainment', label: 'Entertainment', icon: Clapperboard },
] as const

const STATUS_TABS = [
  { id: 'active', label: 'Active' },
  { id: 'resolved', label: 'Resolved' },
] as const

const SORT_OPTIONS = [
  { id: 'active', label: 'Most Active' },
  { id: 'newest', label: 'Newest' },
  { id: 'closing', label: 'Closing Soon' },
  { id: 'debated', label: 'Most Debated' },
] as const

interface Props {
  initialMarkets: PredictionMarket[]
  /** Total active markets for current sort/category (server pagination) */
  totalMarketsCount?: number
  marketsPage?: number
  marketsPageSize?: number
  trendingMarkets?: PredictionMarket[]
  quickMarkets?: { markets: PredictionMarket[]; label: string }
  categoryCounts: Record<string, number>
  resolvedCount?: number
  historyByMarket?: Record<string, { probability: number; recorded_at: string }[]>
  outcomesByMarket?: Record<
    string,
    Array<{ id: string; label: string; probability: number; sort_order: number; translations?: unknown }>
  >
  initialCategory?: string
  initialSort?: string
}

export function MarketsClient({
  initialMarkets,
  totalMarketsCount = 0,
  marketsPage = 1,
  marketsPageSize = 12,
  trendingMarkets = [],
  quickMarkets = { markets: [], label: 'Quick Predictions' },
  categoryCounts,
  resolvedCount = 0,
  historyByMarket = {},
  outcomesByMarket = {},
  initialCategory = 'all',
  initialSort = 'active',
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [markets, setMarkets] = useState<PredictionMarket[]>(initialMarkets)
  const [statusTab, setStatusTab] = useState<'active' | 'resolved'>('active')
  const [category, setCategory] = useState<string>(searchParams.get('category') || initialCategory)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [clientListPage, setClientListPage] = useState(1)
  const [clientTotal, setClientTotal] = useState<number | null>(null)

  const sort = searchParams.get('sort') || initialSort
  const urlPage = Math.max(1, parseInt(searchParams.get('page') || String(marketsPage), 10))
  const serverTotalPages = Math.max(1, Math.ceil((totalMarketsCount || 0) / marketsPageSize))
  const clientTotalPages = Math.max(1, Math.ceil((clientTotal ?? 0) / marketsPageSize))

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setMarkets(initialMarkets)
  }, [initialMarkets])

  useEffect(() => {
    setClientListPage(1)
    setClientTotal(null)
  }, [statusTab, debouncedSearch, category])

  const pushQuery = (next: { sort?: string; category?: string; page?: number }) => {
    const params = new URLSearchParams()
    const s = next.sort ?? sort
    const c = next.category ?? category
    const p = next.page
    if (s !== 'active') params.set('sort', s)
    if (c !== 'all') params.set('category', c)
    if (p != null && p > 1) params.set('page', String(p))
    router.push(`/predictions/markets${params.toString() ? `?${params}` : ''}`)
  }

  const setSort = (s: string) => {
    pushQuery({ sort: s, page: 1 })
  }

  const setCategoryAndNavigate = (cat: string) => {
    setCategory(cat)
    pushQuery({ category: cat, page: 1 })
  }

  const goToServerPage = (p: number) => {
    pushQuery({ page: p <= 1 ? 1 : p })
  }

  const setStatusTabAndNavigate = (tab: 'active' | 'resolved') => {
    setStatusTab(tab)
    setClientListPage(1)
    const params = new URLSearchParams()
    if (sort !== 'active') params.set('sort', sort)
    if (category !== 'all') params.set('category', category)
    const path = `/predictions/markets${params.toString() ? `?${params}` : ''}`
    router.push(path)
    if (tab === 'active') router.refresh()
  }

  const fetchMarkets = useCallback(async () => {
    setSearching(true)
    try {
      const params = new URLSearchParams()
      params.set('status', statusTab)
      if (category !== 'all') params.set('category', category)
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (sort !== 'active') params.set('sort', sort)
      params.set('limit', String(marketsPageSize))
      params.set('offset', String((clientListPage - 1) * marketsPageSize))
      const res = await fetch(`/api/predictions/markets?${params}`)
      const data = await res.json()
      if (data.markets) setMarkets(data.markets)
      if (data.pagination?.total != null) setClientTotal(data.pagination.total)
    } catch (err) {
      console.error('Fetch markets error:', err)
    } finally {
      setSearching(false)
    }
  }, [statusTab, category, debouncedSearch, sort, clientListPage, marketsPageSize])

  useEffect(() => {
    if (statusTab === 'resolved' || debouncedSearch || category !== 'all') {
      fetchMarkets()
    } else {
      setMarkets(initialMarkets)
    }
  }, [statusTab, debouncedSearch, category, initialMarkets, fetchMarkets])

  const serverDrivenList =
    statusTab === 'active' && !debouncedSearch && category === 'all'

  const totalPages = serverDrivenList ? serverTotalPages : clientTotalPages
  const currentPage = serverDrivenList ? urlPage : clientListPage
  const showPagination =
    !searching &&
    markets.length > 0 &&
    totalPages > 1 &&
    (statusTab === 'resolved' || debouncedSearch || category !== 'all' || serverDrivenList)

  const filteredQuickMarkets =
    category === 'all'
      ? quickMarkets.markets
      : quickMarkets.markets.filter((m) => m.category === category)
  const filteredTrendingMarkets =
    category === 'all'
      ? trendingMarkets
      : trendingMarkets.filter((m) => m.category === category)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Markets</h1>
        <p className="text-slate-400 mt-1">Browse and predict on markets</p>
      </div>

      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusTabAndNavigate(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              statusTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.id === 'resolved' && resolvedCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-white/20">{resolvedCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="search"
          placeholder="Search markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#2d3748] bg-[#1a2029] text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
        />
      </div>

      <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const count =
              cat.id === 'all' ? Object.values(categoryCounts).reduce((a, b) => a + b, 0) : categoryCounts[cat.id] || 0
            const isActive = category === cat.id

            return (
              <button
                key={cat.id}
                onClick={() => setCategoryAndNavigate(cat.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                  ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'}
                `}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${isActive ? 'bg-white/20' : 'bg-slate-700/50'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {statusTab === 'active' && (
        <>
          {/* Trending section */}
          {filteredTrendingMarkets.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                Trending Now
              </h2>
              <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
                <div className="flex gap-4 pb-4 min-w-max">
                  {filteredTrendingMarkets.map((market) => (
                    <div key={market.id} className="flex-shrink-0">
                      <MarketCard
                        market={market}
                        history={historyByMarket[market.id] ?? []}
                        outcomes={outcomesByMarket[market.id]}
                        variant="trending"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Quick Predictions */}
          {filteredQuickMarkets.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                {quickMarkets.label}
              </h2>
              <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
                <div className="flex gap-4 pb-4 min-w-max">
                  {filteredQuickMarkets.map((market) => (
                    <div key={market.id} className="flex-shrink-0 w-[280px]">
                      <MarketCard
                        market={market}
                        history={historyByMarket[market.id] ?? []}
                        outcomes={outcomesByMarket[market.id]}
                        variant="quick"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Sort options */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-slate-400 text-sm self-center mr-2">Sort by:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSort(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sort === opt.id
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {searching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-full border-t-2 border-t-slate-700"
            >
              <div className="h-6 bg-slate-800 rounded-full w-1/4 mb-4 animate-pulse" />
              <div className="h-10 bg-slate-800 rounded mb-4 animate-pulse" />
              <div className="h-10 bg-slate-800 rounded mb-4 animate-pulse" />
              <div className="h-2 bg-slate-800 rounded-full mb-4 animate-pulse" />
              <div className="h-4 bg-slate-800 rounded w-1/2 mb-2 animate-pulse" />
              <div className="h-4 bg-slate-800 rounded w-1/3 mb-4 animate-pulse" />
              <div className="mt-auto pt-3 border-t border-slate-800">
                <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">
            {category !== 'all'
              ? 'No hay mercados en esta categoría aún'
              : 'No markets found'}
          </p>
          <p className="text-sm mt-2">
            {category !== 'all' ? (
              <>
                ¿Tienes una idea?{' '}
                <Link href="/predictions/inbox" className="text-emerald-400 hover:text-emerald-300 font-medium">
                  Sugiere un mercado →
                </Link>
              </>
            ) : search || statusTab === 'resolved' ? (
              'Try adjusting your search or filters'
            ) : (
              'Markets will appear here when they are active'
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              history={historyByMarket[market.id] ?? []}
              outcomes={outcomesByMarket[market.id]}
            />
          ))}
        </div>
      )}

      {showPagination && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() =>
              serverDrivenList ? goToServerPage(currentPage - 1) : setClientListPage((p) => Math.max(1, p - 1))
            }
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() =>
              serverDrivenList
                ? goToServerPage(currentPage + 1)
                : setClientListPage((p) => Math.min(totalPages, p + 1))
            }
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-700"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
