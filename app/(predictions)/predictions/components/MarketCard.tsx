'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getMarketText, getOutcomeLabel, getOutcomeCardLabel } from '@/lib/i18n/market-translations'
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
  Calendar,
  CheckCircle,
  Flame,
  BarChart3,
  Map,
  Cpu,
  Clapperboard,
} from 'lucide-react'
import type { Database } from '@/types/database'
import { hasGuestVotedMarket } from '@/lib/guest-vote-storage'
import { toDisplayPercent } from '@/lib/probability-utils'
import { MiniSparkline } from './MiniSparkline'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row'] & {
  market_type?: string | null
  total_votes?: number | null
  engagement_count?: number | null
  sponsor_name?: string
  sponsor_logo_url?: string
  image_url?: string
}

type OutcomeRow = {
  id: string
  label: string
  probability: number
  sort_order?: number
  translations?: unknown
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
  pulse: {
    label: 'Pulse',
    icon: BarChart3,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    accent: 'border-t-amber-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(251,191,36,0.35)]',
  },
  geopolitics: {
    label: 'Geopolitics',
    icon: Map,
    bg: 'bg-sky-500/20',
    text: 'text-sky-400',
    accent: 'border-t-sky-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(56,189,248,0.35)]',
  },
  technology: {
    label: 'Technology',
    icon: Cpu,
    bg: 'bg-violet-500/20',
    text: 'text-violet-400',
    accent: 'border-t-violet-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(167,139,250,0.35)]',
  },
  economy: {
    label: 'Economy',
    icon: TrendingUp,
    bg: 'bg-teal-500/20',
    text: 'text-teal-400',
    accent: 'border-t-teal-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(45,212,191,0.35)]',
  },
  entertainment: {
    label: 'Entertainment',
    icon: Clapperboard,
    bg: 'bg-fuchsia-500/20',
    text: 'text-fuchsia-400',
    accent: 'border-t-fuchsia-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(232,121,249,0.35)]',
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

function syntheticBinaryOutcomes(market: PredictionMarket, locale: string): OutcomeRow[] {
  const p = Number(market.current_probability ?? 0.5)
  const yes = locale === 'en' ? 'Yes' : 'Sí'
  const no = 'No'
  return [
    { id: `syn-yes-${market.id}`, label: yes, probability: p, sort_order: 0 },
    { id: `syn-no-${market.id}`, label: no, probability: 1 - p, sort_order: 1 },
  ].sort((a, b) => b.probability - a.probability)
}

interface MarketCardProps {
  market: PredictionMarket & { recent_votes?: number }
  history?: { probability: number; recorded_at: string }[]
  outcomes?: OutcomeRow[]
  variant?: 'default' | 'trending' | 'quick'
}

export function MarketCard({ market, history = [], outcomes: outcomesProp, variant = 'default' }: MarketCardProps) {
  const locale = useLocale()
  const [guestVoted, setGuestVoted] = useState(false)
  useEffect(() => {
    setGuestVoted(hasGuestVotedMarket(market.id))
  }, [market.id])
  const isPulse =
    Boolean((market as { is_pulse?: boolean }).is_pulse) || market.category === 'pulse'
  const config = isPulse
    ? {
        label: 'Conscious Pulse',
        icon: BarChart3,
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        accent: 'border-t-amber-400/50',
        hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(251,191,36,0.35)]',
      }
    : CATEGORY_CONFIG[market.category] || CATEGORY_CONFIG.world
  const Icon = config.icon
  const engagement =
    Number(market.engagement_count) || Number(market.total_votes) || Number(market.total_volume) || 0
  const recentVotes = market.recent_votes ?? 0
  const urgency = getUrgency(market.resolution_date)
  const isTrending = variant === 'trending'

  const raw =
    outcomesProp && outcomesProp.length > 0
      ? [...outcomesProp].sort((a, b) => Number(b.probability) - Number(a.probability))
      : syntheticBinaryOutcomes(market, locale)

  const isBinaryLayout = raw.length === 2
  const multiRows = isBinaryLayout ? [] : raw.slice(0, 4)
  const moreCount = !isBinaryLayout && raw.length > 4 ? raw.length - 4 : 0

  const accent = config.accent ?? 'border-t-slate-500/50'
  const hoverGlow = config.hoverGlow ?? 'group-hover:shadow-[0_0_20px_rgba(148,163,184,0.3)]'

  const barHBinary = 'h-8'
  const barHMulti = 'h-7'
  const labelW = 'w-24 sm:w-28'

  const predictLabel = locale === 'es' ? 'Predecir' : 'Predict'

  return (
    <Link href={`/predictions/markets/${market.id}`}>
      <div
        className={`group bg-[#1a2029] border border-[#2d3748] rounded-xl flex flex-col h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3d4a5c] hover:shadow-lg border-t-2 ${accent} ${hoverGlow} ${
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
          <div className="flex items-center gap-1.5 shrink-0">
            {guestVoted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <CheckCircle className="w-3 h-3" />
                {locale === 'en' ? 'Voted' : 'Votaste'}
              </span>
            )}
            {isTrending && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                <Flame className="w-3 h-3" />
                Trending
              </span>
            )}
          </div>
        </div>

        {market.image_url && (
          <div className={`relative mb-3 -mt-1 h-24 ${isTrending ? '-mx-6' : '-mx-5'}`}>
            <Image
              src={market.image_url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover rounded-t-xl"
            />
          </div>
        )}

        <h3 className="text-white font-semibold line-clamp-2 mb-4 min-h-[2.5rem]">
          {getMarketText(market, 'title', locale)}
        </h3>

        <div className="mb-4">
          {isBinaryLayout ? (
            <div className="grid grid-cols-2 gap-2">
              {raw.map((o, idx) => {
                const pct = Math.round(toDisplayPercent(o.probability))
                const label = getOutcomeCardLabel(o, locale)
                const fillClass = idx === 0 ? 'bg-emerald-500/20' : 'bg-gray-500/20'
                return (
                  <div
                    key={o.id}
                    className={`relative flex items-center overflow-hidden rounded-lg bg-gray-800/50 px-3 ${barHBinary}`}
                  >
                    <div
                      className={`absolute left-0 top-0 h-full rounded-lg ${fillClass}`}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative z-10 flex w-full min-w-0 justify-between gap-1 text-sm">
                      <span className="line-clamp-2 text-left leading-tight text-gray-200">{label}</span>
                      <span className="shrink-0 font-semibold text-white">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {multiRows.map((o, idx) => {
                const pct = Math.round(toDisplayPercent(o.probability))
                const label = getOutcomeCardLabel(o, locale)
                const fillClass = idx === 0 ? 'bg-emerald-500/20' : 'bg-gray-500/20'
                return (
                  <div key={o.id} className="flex items-start gap-3">
                    <span
                      className={`${labelW} shrink-0 line-clamp-2 text-sm leading-tight text-gray-300`}
                    >
                      {label}
                    </span>
                    <div className={`relative min-w-0 flex-1 overflow-hidden rounded-lg bg-gray-800/50 ${barHMulti}`}>
                      <div
                        className={`absolute left-0 top-0 h-full rounded-lg ${fillClass}`}
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative z-10 flex h-full items-center justify-end px-2">
                        <span className="w-[45px] text-right text-sm font-semibold text-white">{pct}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {moreCount > 0 && (
                <p className="text-xs text-emerald-400/90">
                  +{moreCount} {locale === 'es' ? 'más en el mercado' : 'more on market page'}
                </p>
              )}
            </div>
          )}
        </div>

        {history.length >= 2 && (
          <div className="mb-4">
            <MiniSparkline
              data={history.map((h) => ({ value: toDisplayPercent(h.probability) }))}
              positive={
                history.length >= 2
                  ? toDisplayPercent(history[history.length - 1].probability) >=
                    toDisplayPercent(history[0].probability)
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
                {engagement.toLocaleString()}
              </span>{' '}
              {locale === 'en' ? 'engagements' : 'participaciones'}
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

        <div className="mt-auto pt-3 border-t border-[#2d3748] space-y-3">
          {market.sponsor_name && (
            <div className="flex items-center gap-2">
              {market.sponsor_logo_url ? (
                <Image
                  src={market.sponsor_logo_url}
                  alt={market.sponsor_name}
                  width={80}
                  height={20}
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
            <div className="flex justify-end">
              <span className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-emerald-600">
                {predictLabel} →
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
