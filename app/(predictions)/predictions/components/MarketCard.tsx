'use client'

import { useState } from 'react'
import {
  Globe,
  Building2,
  Briefcase,
  Users,
  Heart,
  TrendingUp,
  TrendingDown,
  Calendar,
} from 'lucide-react'
import type { Database } from '@/types/database'
import { TradeModal } from './TradeModal'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string }
> = {
  world: {
    label: 'World',
    icon: Globe,
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
  },
  government: {
    label: 'Government',
    icon: Building2,
    bg: 'bg-red-500/20',
    text: 'text-red-400',
  },
  corporate: {
    label: 'Corporate',
    icon: Briefcase,
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
  },
  community: {
    label: 'Community',
    icon: Users,
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
  },
  cause: {
    label: 'Cause',
    icon: Heart,
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
  },
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`
  return `$${vol.toFixed(0)}`
}

function getCountdown(resolutionDate: string): string {
  const end = new Date(resolutionDate)
  const now = new Date()
  const diffMs = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Resolved'
  if (diffDays === 0) return 'Ends today'
  if (diffDays === 1) return 'Resolves tomorrow'
  if (diffDays < 30) return `Resolves in ${diffDays} days`
  if (diffDays < 365) {
    const months = Math.round(diffDays / 30)
    return `Resolves in ${months} month${months > 1 ? 's' : ''}`
  }
  const years = Math.round(diffDays / 365)
  return `Resolves in ${years} year${years > 1 ? 's' : ''}`
}

interface MarketCardProps {
  market: PredictionMarket
}

export function MarketCard({ market }: MarketCardProps) {
  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [tradeSide, setTradeSide] = useState<'yes' | 'no'>('yes')

  const config = CATEGORY_CONFIG[market.category] || CATEGORY_CONFIG.world
  const Icon = config.icon
  const prob = Number(market.current_probability)
  const volume = Number(market.total_volume)
  const consciousAmount =
    volume * (Number(market.conscious_fund_percentage) / 100)

  const openTrade = (side: 'yes' | 'no') => {
    setTradeSide(side)
    setTradeModalOpen(true)
  }

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {config.label}
          </span>
        </div>

        <h3 className="text-white font-semibold line-clamp-2 mb-4 min-h-[2.5rem]">
          {market.title}
        </h3>

        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-white">
              {prob.toFixed(0)}%
            </span>
            <span className="text-slate-400 text-sm">YES</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full rounded-l-full transition-all"
              style={{ width: `${prob}%` }}
            />
            <div
              className="bg-red-500/60 h-full rounded-r-full transition-all"
              style={{ width: `${100 - prob}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-400 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span>Volume: {formatVolume(volume)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>{getCountdown(market.resolution_date)}</span>
          </div>
        </div>

        <div className="mb-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-xs text-emerald-400">
            This market has funded {formatVolume(consciousAmount)} for{' '}
            {config.label.toLowerCase()}
          </p>
        </div>

        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => openTrade('yes')}
            className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            Yes ↑
          </button>
          <button
            onClick={() => openTrade('no')}
            className="flex-1 py-2.5 px-3 rounded-lg bg-red-600/80 hover:bg-red-500/80 text-white font-medium text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <TrendingDown className="w-4 h-4" />
            No ↓
          </button>
        </div>
      </div>

      <TradeModal
        market={market}
        side={tradeSide}
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
      />
    </>
  )
}
