'use client'

import Link from 'next/link'
import {
  Globe,
  Building2,
  Briefcase,
  Users,
  Heart,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
} from 'lucide-react'
import type { Database } from '@/types/database'
import { MiniSparkline } from './MiniSparkline'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row'] & {
  market_type?: string
  total_votes?: number
  sponsor_name?: string
  image_url?: string
}

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
  history?: { probability: number; recorded_at: string }[]
  leadingOutcome?: { label: string; probability: number } | null
}

export function MarketCard({ market, history = [], leadingOutcome }: MarketCardProps) {
  const config = CATEGORY_CONFIG[market.category] || CATEGORY_CONFIG.world
  const Icon = config.icon
  const prob = Number(market.current_probability)
  const voteCount = (market.total_votes ?? 0) || Number(market.total_volume) || 0

  return (
    <Link href={`/predictions/markets/${market.id}`}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {config.label}
          </span>
          {market.sponsor_name && (
            <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
              Sponsored
            </span>
          )}
        </div>

        {market.image_url && (
          <div className="mb-3 -mx-5 -mt-1">
            <img
              src={market.image_url}
              alt=""
              className="w-full h-24 object-cover rounded-t-xl"
            />
          </div>
        )}

        <h3 className="text-white font-semibold line-clamp-2 mb-4 min-h-[2.5rem]">
          {market.title}
        </h3>

        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-white">
              {leadingOutcome
                ? `${leadingOutcome.label} ${Math.round((leadingOutcome.probability || 0) * 100)}%`
                : `${prob.toFixed(0)}%`}
            </span>
            {!leadingOutcome && (
              <span className="text-slate-400 text-sm">YES</span>
            )}
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

        {history.length >= 2 && (
          <div className="mb-4">
            <MiniSparkline
              data={history.map((h) => ({ value: h.probability }))}
              positive={
                history.length >= 2
                  ? history[history.length - 1].probability >= history[0].probability
                  : true
              }
              width={120}
              height={40}
              className="rounded"
            />
          </div>
        )}

        <div className="space-y-2 text-sm text-slate-400 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span>{voteCount} predictions</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>{getCountdown(market.resolution_date)}</span>
          </div>
        </div>

        {market.status === 'resolved' ? (
          <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-700 text-slate-300 text-sm font-medium mt-auto">
            <CheckCircle className="w-4 h-4" />
            Resolved — View details
          </div>
        ) : (
          <div className="flex gap-2 mt-auto">
            <span className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600/80 text-white text-sm font-medium text-center">
              Predict
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
