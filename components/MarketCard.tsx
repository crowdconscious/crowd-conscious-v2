'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
import { useLocale } from '@/lib/i18n/useLocale'
import {
  getMarketText,
  getOutcomeCardLabel,
  type MarketWithTranslations,
} from '@/lib/i18n/market-translations'
import { toDisplayPercent } from '@/lib/probability-utils'
import {
  isPulseLikeMarket,
  marketCardPredictCta,
  voteCountLabelPublic,
} from '@/lib/i18n/pulse-market-copy'
import { PUBLIC_MARKET_MIN_VOTES } from '@/lib/predictions/engagement'
import { SponsorBadge } from '@/components/SponsorBadge'
import { hasGuestVotedMarket } from '@/lib/guest-vote-storage'
import { MiniSparkline } from '@/app/(predictions)/predictions/components/MiniSparkline'

/**
 * MarketCard — single source of truth for prediction market / Pulse cards.
 *
 * Replaces the older split between `components/MarketCard.tsx` (public) and
 * `app/(predictions)/predictions/components/MarketCard.tsx` (auth) which had
 * drifted apart over time. This is the unified component approved on
 * April 28, 2026 (Prompt 4.5).
 *
 * The `context` prop gates the auth-only chrome:
 *
 *   - context="public" (default)  – landing, /markets, sponsor flows
 *       · low-engagement placeholder when votes < PUBLIC_MARKET_MIN_VOTES
 *         (override with showLowEngagementBars)
 *       · no sparkline, no "recent votes" badge, no "Voted" guest pill
 *
 *   - context="auth"               – /predictions index, dashboards
 *       · sparkline when `history` is provided (≥2 points)
 *       · "+ N new" recent-vote badge
 *       · "Voted" pill when localStorage records a guest vote
 *       · always renders bars regardless of vote count
 *
 * Decisions baked in (see chat for the source comparison):
 *   1) B-style visual identity (category-tinted top accent + hover glow,
 *      icon on the category pill) so the cards feel consistent across the
 *      product instead of the cards getting flashier once you log in.
 *   2) Uniform card height — h3 carries `min-h-[2.5rem]` so a row of cards
 *      doesn't jump because of 2-line vs 3-line titles.
 *   3) All bars are `bg-emerald-500/20`. We don't visually elect a winner
 *      on small previews (the leader is still on top by sort).
 *   4) Outcome labels use `getOutcomeCardLabel`, which auto-splits the
 *      legacy `ES / EN` stuffed strings.
 *   5) Public-only low-engagement gate kept as a `showLowEngagementBars`
 *      override so admin / dashboard surfaces can force-show bars.
 *   6) Footer = small `Predict →` pill in the bottom-right. Suppressible
 *      via `showPredictCta={false}` for sponsor mode where the caller
 *      renders its own CTA below the card.
 *   7) `getCountdown` returns "Resolves in N days/months/years" in EN and
 *      the Spanish equivalents in ES.
 *   8) Sponsor badge sits in the header row (right side), next to the
 *      category pill, matching the older public layout.
 *   9) Cover image is opt-in via `showCover`. Off by default to keep
 *      dense grids scannable.
 *  10) Locale comes from `useLocale()` everywhere — same hook the rest
 *      of the predictions surface uses.
 *  11) `context` + a small bag of optional flags replaces the older
 *      `variant` / flag-soup APIs.
 */

const CATEGORY_CONFIG: Record<
  string,
  {
    labelEn: string
    labelEs: string
    icon: React.ElementType
    bg: string
    text: string
    accent: string
    hoverGlow: string
  }
> = {
  world: {
    labelEn: 'World',
    labelEs: 'Mundo',
    icon: Globe,
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    accent: 'border-t-blue-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(96,165,250,0.35)]',
  },
  government: {
    labelEn: 'Government',
    labelEs: 'Gobierno',
    icon: Building2,
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    accent: 'border-t-slate-400/60',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(148,163,184,0.35)]',
  },
  geopolitics: {
    labelEn: 'Geopolitics',
    labelEs: 'Geopolítica',
    icon: Map,
    bg: 'bg-sky-500/20',
    text: 'text-sky-400',
    accent: 'border-t-sky-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(56,189,248,0.35)]',
  },
  corporate: {
    labelEn: 'Corporate',
    labelEs: 'Corporativo',
    icon: Briefcase,
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    accent: 'border-t-purple-400/60',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(192,132,252,0.35)]',
  },
  community: {
    labelEn: 'Community',
    labelEs: 'Comunidad',
    icon: Users,
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    accent: 'border-t-emerald-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(52,211,153,0.35)]',
  },
  cause: {
    labelEn: 'Cause',
    labelEs: 'Causa',
    icon: Heart,
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    accent: 'border-t-amber-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(251,191,36,0.35)]',
  },
  world_cup: {
    labelEn: 'World Cup',
    labelEs: 'Mundial',
    icon: Trophy,
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    accent: 'border-t-amber-400/80',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(251,191,36,0.45)]',
  },
  sustainability: {
    labelEn: 'Sustainability',
    labelEs: 'Sostenibilidad',
    icon: Leaf,
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    accent: 'border-t-green-400/60',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(74,222,128,0.35)]',
  },
  pulse: {
    labelEn: 'Pulse',
    labelEs: 'Pulse',
    icon: BarChart3,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    accent: 'border-t-amber-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(251,191,36,0.35)]',
  },
  technology: {
    labelEn: 'Technology',
    labelEs: 'Tecnología',
    icon: Cpu,
    bg: 'bg-violet-500/20',
    text: 'text-violet-400',
    accent: 'border-t-violet-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(167,139,250,0.35)]',
  },
  economy: {
    labelEn: 'Economy',
    labelEs: 'Economía',
    icon: TrendingUp,
    bg: 'bg-teal-500/20',
    text: 'text-teal-400',
    accent: 'border-t-teal-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(45,212,191,0.35)]',
  },
  entertainment: {
    labelEn: 'Entertainment',
    labelEs: 'Entretenimiento',
    icon: Clapperboard,
    bg: 'bg-fuchsia-500/20',
    text: 'text-fuchsia-400',
    accent: 'border-t-fuchsia-400/50',
    hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(232,121,249,0.35)]',
  },
}

const PULSE_CONFIG: (typeof CATEGORY_CONFIG)[string] = {
  labelEn: 'Conscious Pulse',
  labelEs: 'Conscious Pulse',
  icon: BarChart3,
  bg: 'bg-amber-500/10',
  text: 'text-amber-400',
  accent: 'border-t-amber-400/50',
  hoverGlow: 'group-hover:shadow-[0_0_20px_rgba(251,191,36,0.35)]',
}

export type MarketCardMarket = {
  id: string
  title: string
  translations?: unknown
  /** Migration 215 — 2-line clamp shown under the title (non-compact only). */
  description_short?: string | null
  total_votes?: number | null
  /** Auth surface only — pre-aggregated count when supplied. */
  engagement_count?: number | null
  total_volume?: number | null
  /** Auth surface only — 24h delta for the live "+N new" badge. */
  recent_votes?: number | null
  current_probability: number
  category: string
  market_type?: string | null
  resolution_date: string
  status?: string
  sponsor_name?: string | null
  sponsor_logo_url?: string | null
  sponsor_url?: string | null
  /** Optional cover image (only rendered when `showCover` is true). */
  image_url?: string | null
  is_pulse?: boolean | null
}

export type MarketCardOutcome = {
  id: string
  label: string
  probability: number
  sort_order?: number
  translations?: unknown
}

function categoryConfig(category: string, isPulse: boolean) {
  if (isPulse) return PULSE_CONFIG
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.world
}

function categoryLabel(
  config: (typeof CATEGORY_CONFIG)[string],
  locale: string
): string {
  return locale === 'es' ? config.labelEs : config.labelEn
}

/** Localized "Resolves in …" / "Cierra en …" — 24h precision near term, then
 *  months / years. Resolved markets get "Resuelto" / "Resolved". */
function getCountdown(resolutionDate: string, locale: string): string {
  const end = new Date(resolutionDate).getTime()
  const now = Date.now()
  const diffMs = end - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const es = locale === 'es'
  if (diffDays < 0) return es ? 'Resuelto' : 'Resolved'
  if (diffDays === 0) return es ? 'Termina hoy' : 'Ends today'
  if (diffDays === 1) return es ? 'Cierra mañana' : 'Resolves tomorrow'
  if (diffDays < 30) {
    return es ? `Cierra en ${diffDays} días` : `Resolves in ${diffDays} days`
  }
  if (diffDays < 365) {
    const months = Math.round(diffDays / 30)
    if (es) return `Cierra en ${months} ${months > 1 ? 'meses' : 'mes'}`
    return `Resolves in ${months} month${months > 1 ? 's' : ''}`
  }
  const years = Math.round(diffDays / 365)
  if (es) return `Cierra en ${years} ${years > 1 ? 'años' : 'año'}`
  return `Resolves in ${years} year${years > 1 ? 's' : ''}`
}

type UrgencyLevel = 'critical' | 'soon' | 'medium' | 'far'

function getUrgency(resolutionDate: string): {
  level: UrgencyLevel
  days: number
} {
  const end = new Date(resolutionDate).getTime()
  const diffMs = end - Date.now()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { level: 'far', days: 0 }
  if (diffDays < 7) return { level: 'critical', days: diffDays }
  if (diffDays < 30) return { level: 'soon', days: diffDays }
  if (diffDays < 90) return { level: 'medium', days: diffDays }
  return { level: 'far', days: diffDays }
}

function syntheticBinaryOutcomes(
  market: MarketCardMarket,
  locale: string
): MarketCardOutcome[] {
  const p = Number(market.current_probability ?? 0.5)
  const yes = locale === 'en' ? 'Yes' : 'Sí'
  return [
    { id: `syn-yes-${market.id}`, label: yes, probability: p, sort_order: 0 },
    { id: `syn-no-${market.id}`, label: 'No', probability: 1 - p, sort_order: 1 },
  ].sort((a, b) => b.probability - a.probability)
}

export type MarketCardContext = 'public' | 'auth'
export type MarketCardVariant = 'default' | 'trending' | 'quick'

export interface MarketCardProps {
  market: MarketCardMarket
  outcomes?: MarketCardOutcome[]
  /** Auth-only — probability sparkline source. ≥2 points to render. */
  history?: { probability: number; recorded_at: string }[]
  /** Default `'public'`. See file header for what `'auth'` adds. */
  context?: MarketCardContext
  /** Tighter padding; `description_short` is suppressed in compact mode. */
  compact?: boolean
  /** Render `market.image_url` as a 96px cover banner above the title. */
  showCover?: boolean
  showCategory?: boolean
  showDeadline?: boolean
  showVoteCount?: boolean
  /**
   * Public surface only — by default, public cards with fewer than
   * `PUBLIC_MARKET_MIN_VOTES` votes show a "Be one of the first voices"
   * placeholder instead of the bars. Set this to `true` to override
   * (admin & user-dashboard surfaces use this so dead markets stay
   * visible to operators).
   */
  showLowEngagementBars?: boolean
  /** Set to `false` to hide the bottom predict pill (sponsor mode). */
  showPredictCta?: boolean
  /** Trending row gets a wider min-width and slightly bigger padding. */
  variant?: MarketCardVariant
}

export function MarketCard({
  market,
  outcomes,
  history,
  context = 'public',
  compact = false,
  showCover = false,
  showCategory = true,
  showDeadline = true,
  showVoteCount = true,
  showLowEngagementBars = false,
  showPredictCta = true,
  variant = 'default',
}: MarketCardProps) {
  const locale = useLocale()
  const loc = locale === 'en' ? 'en' : 'es'

  const [guestVoted, setGuestVoted] = useState(false)
  useEffect(() => {
    if (context !== 'auth') return
    setGuestVoted(hasGuestVotedMarket(market.id))
  }, [market.id, context])

  const isPulse = isPulseLikeMarket(market)
  const config = categoryConfig(market.category, isPulse)
  const Icon = config.icon

  const engagement =
    Number(market.engagement_count) ||
    Number(market.total_votes) ||
    Number(market.total_volume) ||
    0
  const recentVotes = Number(market.recent_votes ?? 0)
  const urgency = getUrgency(market.resolution_date || new Date().toISOString())
  const isTrending = variant === 'trending'

  const isLowEngagement =
    context === 'public' &&
    !showLowEngagementBars &&
    engagement < PUBLIC_MARKET_MIN_VOTES

  const raw =
    outcomes && outcomes.length > 0
      ? [...outcomes].sort(
          (a, b) => Number(b.probability) - Number(a.probability)
        )
      : syntheticBinaryOutcomes(market, locale)

  const isBinaryLayout = raw.length === 2
  const multiRows = isBinaryLayout ? [] : raw.slice(0, 4)
  const moreCount =
    !isBinaryLayout && raw.length > 4 ? raw.length - 4 : 0

  const padX = isTrending ? 'p-6 min-w-[280px]' : compact ? 'p-4' : 'p-5'
  const coverNegMx = isTrending ? '-mx-6' : compact ? '-mx-4' : '-mx-5'
  const barFill = 'bg-emerald-500/20'

  const detailHref = `/predictions/markets/${market.id}`
  const isResolved = market.status === 'resolved'
  const showAuthChrome = context === 'auth'

  return (
    <Link href={detailHref} className="block text-inherit no-underline">
      <div
        className={`group flex h-full flex-col rounded-xl border border-[#2d3748] bg-[#1a2029] border-t-2 ${config.accent} ${config.hoverGlow} transition-all duration-200 hover:-translate-y-0.5 hover:border-[#3d4a5c] hover:shadow-lg ${padX}`}
      >
        {/* Header row — category pill (left) + auth pills + sponsor (right).
            Wraps when narrow so a sponsored auth card with a "Voted" pill
            still degrades gracefully instead of overflowing. */}
        {showCategory && (
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {categoryLabel(config, locale)}
            </span>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
              {showAuthChrome && guestVoted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  {loc === 'en' ? 'Voted' : 'Votaste'}
                </span>
              )}
              {isTrending && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                  <Flame className="h-3 w-3" />
                  Trending
                </span>
              )}
              {market.sponsor_name ? (
                <div className="min-w-0 max-w-[55%]">
                  <SponsorBadge
                    sponsorName={market.sponsor_name}
                    sponsorUrl={market.sponsor_url}
                    sponsorLogoUrl={market.sponsor_logo_url}
                    className="justify-end"
                    size="sm"
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {!showCategory && market.sponsor_name ? (
          <div className="mb-3 flex justify-end">
            <SponsorBadge
              sponsorName={market.sponsor_name}
              sponsorUrl={market.sponsor_url}
              sponsorLogoUrl={market.sponsor_logo_url}
              className="justify-end"
              size="sm"
            />
          </div>
        ) : null}

        {showCover && market.image_url ? (
          <div className={`relative -mt-1 mb-3 h-24 ${coverNegMx}`}>
            <Image
              src={market.image_url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="rounded-t-xl object-cover"
            />
          </div>
        ) : null}

        {/* Title — uniform 2-line clamp w/ min-h so a row of cards lines up
            even when titles vary in length. */}
        <h3
          className={`mb-2 line-clamp-2 min-h-[2.5rem] font-semibold leading-snug text-white ${
            compact ? 'text-sm' : 'text-base'
          }`}
        >
          {getMarketText(market as MarketWithTranslations, 'title', locale)}
        </h3>

        {/* description_short (mig. 215). Skipped in compact to stay scannable. */}
        {!compact &&
          (() => {
            const blurb = getMarketText(
              market as MarketWithTranslations,
              'description_short',
              locale
            ).trim()
            if (!blurb) return null
            return (
              <p className="mb-3 line-clamp-2 text-sm leading-snug text-slate-400">
                {blurb}
              </p>
            )
          })()}

        {/* Bars / low-engagement gate */}
        {isLowEngagement ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-center">
            <p className="text-sm font-medium text-white">
              {loc === 'es'
                ? 'Sé una de las primeras voces'
                : 'Be one of the first voices'}
            </p>
            <p className="mt-1 text-xs text-emerald-400">
              {loc === 'es'
                ? `${engagement}/${PUBLIC_MARKET_MIN_VOTES} votos para activar resultados`
                : `${engagement}/${PUBLIC_MARKET_MIN_VOTES} votes to activate results`}
            </p>
          </div>
        ) : isBinaryLayout ? (
          <div className="grid grid-cols-2 gap-2">
            {raw.map((o) => {
              const pct = Math.round(toDisplayPercent(o.probability))
              const label = getOutcomeCardLabel(o, locale)
              return (
                <div
                  key={o.id}
                  className="relative flex h-8 items-center overflow-hidden rounded-lg bg-gray-800/50 px-3"
                >
                  <div
                    className={`absolute left-0 top-0 h-full rounded-lg ${barFill}`}
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative z-10 flex w-full min-w-0 justify-between gap-1 text-sm">
                    <span className="line-clamp-2 text-left leading-tight text-gray-200">
                      {label}
                    </span>
                    <span className="shrink-0 font-semibold text-white">
                      {pct}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {multiRows.map((o) => {
              const pct = Math.round(toDisplayPercent(o.probability))
              const label = getOutcomeCardLabel(o, locale)
              return (
                <div key={o.id} className="flex items-start gap-3">
                  <span className="line-clamp-2 w-24 shrink-0 text-sm leading-tight text-gray-300 sm:w-28">
                    {label}
                  </span>
                  <div className="relative h-7 min-w-0 flex-1 overflow-hidden rounded-lg bg-gray-800/50">
                    <div
                      className={`absolute left-0 top-0 h-full rounded-lg ${barFill}`}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative z-10 flex h-full items-center justify-end px-2">
                      <span className="w-[45px] text-right text-sm font-semibold text-white">
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            {moreCount > 0 && (
              <p className="text-xs text-emerald-400/90">
                +{moreCount}{' '}
                {loc === 'es' ? 'más en el mercado' : 'more on market page'}
              </p>
            )}
          </div>
        )}

        {/* Sparkline — auth surface only, when we have enough history. */}
        {showAuthChrome && history && history.length >= 2 ? (
          <div className="mt-3">
            <MiniSparkline
              data={history.map((h) => ({
                value: toDisplayPercent(h.probability),
              }))}
              positive={
                toDisplayPercent(history[history.length - 1].probability) >=
                toDisplayPercent(history[0].probability)
              }
              width={120}
              height={40}
              className="rounded"
            />
          </div>
        ) : null}

        {/* Engagement + countdown */}
        {(showVoteCount || showDeadline) && (
          <div className="mt-3 space-y-2 text-sm">
            {showVoteCount && (
              <div className="flex items-center gap-2 text-slate-400">
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <span>
                  <span
                    className={
                      showAuthChrome && recentVotes > 0
                        ? 'inline-block animate-[vote-pulse_0.6s_ease-out]'
                        : ''
                    }
                  >
                    {voteCountLabelPublic(loc, engagement, isPulse)}
                  </span>
                  {showAuthChrome && recentVotes > 0 && (
                    <span className="ml-1 text-amber-400">
                      · {recentVotes}{' '}
                      {loc === 'es' ? 'nuevos' : 'new'}
                    </span>
                  )}
                </span>
              </div>
            )}
            {showDeadline && (
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
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                )}
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>{getCountdown(market.resolution_date, locale)}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer: small Predict pill or resolved chip. Suppressed when the
            caller renders its own CTA underneath (sponsor mode). */}
        {showPredictCta && (
          <div className="mt-auto border-t border-[#2d3748] pt-3">
            {isResolved ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-3 py-2.5 text-sm font-medium text-slate-300">
                <CheckCircle className="h-4 w-4" />
                {loc === 'es' ? 'Resuelto — Ver detalles' : 'Resolved — View details'}
              </div>
            ) : (
              <div className="flex justify-end">
                <span className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-emerald-600">
                  {marketCardPredictCta(loc, isPulse)} →
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
