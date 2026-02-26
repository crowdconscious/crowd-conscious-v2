'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Globe, Building2, Briefcase, Users, Heart } from 'lucide-react'
import { MarketCard } from '../components/MarketCard'
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

interface Props {
  initialMarkets: PredictionMarket[]
  categoryCounts: Record<string, number>
}

export function MarketsClient({
  initialMarkets,
  categoryCounts,
}: Props) {
  const [markets, setMarkets] = useState<PredictionMarket[]>(initialMarkets)
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Markets</h1>
        <p className="text-slate-400 mt-1">
          Browse and trade on prediction markets
        </p>
      </div>

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

      <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-2">
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
                onClick={() => setCategory(cat.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                  ${isActive ? 'bg-emerald-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'}
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
  )
}
