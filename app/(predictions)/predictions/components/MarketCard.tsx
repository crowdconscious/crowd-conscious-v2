'use client'

import Link from 'next/link'
import { getMarketText, getOutcomeLabel } from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'
import {
  Globe,
  Building2,
  Briefcase,
  Users,
  Heart,
  Trophy,
  Leaf,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Flame,
  Zap,
} from 'lucide-react'
import type { Database } from '@/types/database'
import { toDisplayPercent } from '@/lib/probability-utils'
import { MiniSparkline } from './MiniSparkline'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row'] & {
  market_type?: string
  total_votes?: number
  sponsor_name?: string
  sponsor_logo_url?: string
  image_url?: string
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string; accent: string; hoverGlow: string }
> = {
  world: {
    label: 'World',
    icon: Globe,
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    accent: 'border-t-blue-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(96,165,250,0.35)]',
  },
  government: {
    label: 'Government',
    icon: Building2,
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    accent: 'border-t-slate-400/60',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(148,163,184,0.35)]',
  },
  corporate: {
    label: 'Corporate',
    icon: Briefcase,
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    accent: 'border-t-purple-400/60',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(192,132,252,0.35)]',
  },
  community: {
    label: 'Community',
    icon: Users,
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    accent: 'border-t-emerald-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(52,211,153,0.35)]',
  },
  cause: {
    label: 'Cause',
    icon: Heart,
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    accent: 'border-t-amber-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(251,191,36,0.35)]',
  },
  world_cup: {
    label: 'World Cup',
    icon: Trophy,
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    accent: 'border-t-amber-400/80',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(251,191,36,0.45)]',
  },
  sustainability: {
    label: 'Sustainability',
    icon: Leaf,
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    accent: 'border-t-green-400/60',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(74,222,128,0.35)]',
  },
}

/** Probability bar color: near 50% = amber (contentious), near 0/100% = green (consensus) */
function getProbabilityBarColor(prob: number): { yes: string; no: string } {
  const p = Math.min(100, Math.max(0, prob))
  const distFrom50 = Math.abs(p - 50)
  if (distFrom50 < 15) return { yes: '#f59e0b', no: 'rgba(245, 158, 11, 0.5)' }
  if (distFrom50 < 30) return { yes: '#eab308', no: 'rgba(234, 179, 8, 0.5)' }
  return { yes: '#10b981', no: 'rgba(239, 68, 68, 0.5)' }
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

type UrgencyLevel = 'critical' | 'soon' | 'medium' | 'far'

function getUrgency(resolutionDate: string): { level: UrgencyLevel; days: number } {
  const end = new Date(resolutionDate)
  const now = new Date()
  const diffMs = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { level: 'far', days: 0 }
  if (diffDays < 7) return { level: 'critical', days: diffDays }
  if (diffDays < 30) return { level: 'soon', days: diffDays }
  if (diffDays < 90) return { level: 'medium', days: diffDays }
  return { level: 'far', days: diffDays }
}

interface MarketCardProps {
  market: PredictionMarket & { recent_votes?: number }
  history?: { probability: number; recorded_at: string }[]
  leadingOutcome?: { label: string; probability: number } | null
  variant?: 'default' | 'trending' | 'quick'
}

export function MarketCard({ market, history = [], leadingOutcome, variant = 'default' }: MarketCardProps) {
  const locale = useLocale()
  const config = CATEGORY_CONFIG[market.category] || CATEGORY_CONFIG.world
  const Icon = config.icon
  const prob = toDisplayPercent(Number(market.current_probability))
  const voteCount = (market.total_votes ?? 0) || Number(market.total_volume) || 0
  const recentVotes = market.recent_votes ?? 0
  const urgency = getUrgency(market.resolution_date)
  const isTrending = variant === 'trending'
  const isQuick = variant === 'quick'

  const barColors = getProbabilityBarColor(prob)
  const accent = config.accent ?? 'border-t-slate-500/50'
  const hoverGlow = config.hoverGlow ?? 'group-hover:shadow-[0_0_20px_rgba(148,163,184,0.3)]'

  return (
    <Link href={`/predictions/markets/${market.id}`}>
      <div
        className={`group bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-lg border-t-2 ${accent} ${hoverGlow} ${
          isTrending ? 'p-6 min-w-[280px]' : 'p-5'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {config.label}
          </span>
          {isTrending && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
              <Flame className="w-3 h-3" />
              Trending
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
          {getMarketText(market, 'title', locale)}
        </h3>

        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-white">
              {leadingOutcome
                ? `${getOutcomeLabel(leadingOutcome, locale)} ${Math.round(toDisplayPercent(leadingOutcome.probability || 0))}%`
                : `${Math.round(prob)}%`}
            </span>
            {!leadingOutcome && (
              <span className="text-slate-400 text-sm">YES</span>
            )}
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="h-full rounded-l-full transition-all duration-300"
              style={{ width: `${prob}%`, background: barColors.yes }}
            />
            <div
              className="h-full rounded-r-full transition-all duration-300"
              style={{ width: `${100 - prob}%`, background: barColors.no }}
            />
          </div>
        </div>

        {history.length >= 2 && (
          <div className="mb-4">
            <MiniSparkline
              data={history.map((h) => ({ value: toDisplayPercent(h.probability) }))}
              positive={
                history.length >= 2
                  ? toDisplayPercent(history[history.length - 1].probability) >= toDisplayPercent(history[0].probability)
                  : true
              }
              width={120}
              height={40}
              className="rounded"
            />
          </div>
        )}

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-slate-400">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span>
              <span
                className={recentVotes > 0 ? 'inline-block animate-[vote-pulse_0.6s_ease-out]' : ''}
              >
                {voteCount}
              </span>{' '}
              predictions
              {recentVotes > 0 && (
                <span className="text-amber-400 ml-1">· {recentVotes} new</span>
              )}
            </span>
          </div>
          <div
            className={`flex items-center gap-2 ${
              urgency.level === 'critical'
                ? 'text-red-400'
                : urgency.level === 'soon'
                  ? 'text-amber-400'
                  : urgency.level === 'medium'
                    ? 'text-amber-300/90'
                    : 'text-slate-400'
            }`}
          >
            {urgency.level === 'critical' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>{getCountdown(market.resolution_date)}</span>
          </div>
        </div>

        {market.sponsor_name && (
          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-800">
            {market.sponsor_logo_url ? (
              <img
                src={market.sponsor_logo_url}
                alt={market.sponsor_name}
                className="h-5 w-auto rounded object-contain bg-slate-800"
              />
            ) : null}
            <span className="text-xs text-slate-500">
              Sponsored by{' '}
              {(market as { sponsor_url?: string }).sponsor_url ? (
                <a
                  href={(market as { sponsor_url?: string }).sponsor_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-emerald-400 hover:underline"
                >
                  {market.sponsor_name}
                </a>
              ) : (
                market.sponsor_name
              )}
            </span>
          </div>
        )}
        {market.status === 'resolved' ? (
          <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-700 text-slate-300 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Resolved — View details
          </div>
        ) : (
          <div className="flex gap-2">
            <span className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600/80 text-white text-sm font-medium text-center">
              Predict
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
