'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Globe, Building2, Briefcase, Users, Heart } from 'lucide-react'
import { MarketCard } from './MarketCard'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'world', label: 'World', icon: Globe },
  { id: 'government', label: 'Government', icon: Building2 },
  { id: 'corporate', label: 'Corporate', icon: Briefcase },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'cause', label: 'Cause', icon: Heart },
] as const

interface Stats {
  totalMarketsActive: number
  totalVolume: number
  consciousFundBalance: number
  grantsAwarded: number
  categoryCounts: Record<string, number>
}

interface Props {
  initialMarkets: PredictionMarket[]
  initialStats: Stats
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

export function PredictionsDashboardClient({
  initialMarkets,
  initialStats,
}: Props) {
  const [markets, setMarkets] = useState<PredictionMarket[]>(initialMarkets)
  const [stats, setStats] = useState<Stats>(initialStats)
  const [category, setCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
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
      const res = await fetch(`/api/predictions/markets?${params}`)
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

  return (
    <div className="space-y-6 pb-24">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Collective Consciousness
        </h1>
        <p className="text-slate-400 mt-1">
          Your predictions fund solutions
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Markets Active</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {stats.totalMarketsActive}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Volume</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(stats.totalVolume)}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Conscious Fund Balance</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatCurrency(stats.consciousFundBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="search"
          placeholder="Search markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const count =
              cat.id === 'all'
                ? stats.totalMarketsActive
                : stats.categoryCounts[cat.id] || 0
            const isWorld = cat.id === 'world'
            const isActive = category === cat.id

            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                  ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'}
                  ${isWorld && !isActive ? 'ring-1 ring-blue-500/30 text-blue-400' : ''}
                `}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                    isActive ? 'bg-white/20' : 'bg-slate-700/50'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Market grid */}
      <div>
        {searching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse"
              >
                <div className="h-6 bg-slate-700 rounded w-1/3 mb-4" />
                <div className="h-12 bg-slate-700 rounded mb-4" />
                <div className="h-4 bg-slate-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg">No markets found</p>
            <p className="text-sm mt-2">
              {search || category !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Markets will appear here when they are active'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>

      {/* Conscious Fund Banner */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-emerald-600/90 backdrop-blur-sm border-t border-emerald-500/30 py-3 px-4 z-20">
        <p className="text-center text-white text-sm font-medium">
          Every trade funds solutions. Conscious Fund Balance:{' '}
          {formatCurrency(stats.consciousFundBalance)} | Grants Awarded:{' '}
          {formatCurrency(stats.grantsAwarded)}
        </p>
      </div>
    </div>
  )
}
