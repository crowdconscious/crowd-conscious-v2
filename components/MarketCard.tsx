'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  getMarketText,
  getOutcomeLabel,
  type MarketWithTranslations,
} from '@/lib/i18n/market-translations'
import { toDisplayPercent } from '@/lib/probability-utils'
import { SponsorBadge } from '@/components/SponsorBadge'
import { isPulseLikeMarket, marketCardPredictCta, voteCountLabelPublic } from '@/lib/i18n/pulse-market-copy'
import { PUBLIC_MARKET_MIN_VOTES } from '@/lib/predictions/engagement'

export type MarketCardMarket = {
  id: string
  title: string
  translations?: unknown
  total_votes?: number | null
  current_probability: number
  category: string
  market_type?: string | null
  resolution_date: string
  status?: string
  sponsor_name?: string | null
  sponsor_logo_url?: string | null
  sponsor_url?: string | null
  image_url?: string | null
  is_pulse?: boolean | null
}

export type MarketCardOutcome = {
  id: string
  label: string
  probability: number
  sort_order: number
  translations?: unknown
}

const CATEGORY_LABELS_ES: Record<string, string> = {
  world: 'Mundo',
  pulse: 'Pulse',
  government: 'Gobierno',
  geopolitics: 'Geopolítica',
  corporate: 'Corporativo',
  community: 'Comunidad',
  cause: 'Causa',
  world_cup: 'Mundial',
  sustainability: 'Sostenibilidad',
  technology: 'Tecnología',
  economy: 'Economía',
  entertainment: 'Entretenimiento',
}

const CATEGORY_LABELS_EN: Record<string, string> = {
  world: 'World',
  pulse: 'Pulse',
  government: 'Government',
  geopolitics: 'Geopolitics',
  corporate: 'Corporate',
  community: 'Community',
  cause: 'Cause',
  world_cup: 'World Cup',
  sustainability: 'Sustainability',
  technology: 'Technology',
  economy: 'Economy',
  entertainment: 'Entertainment',
}

/** Visual style per category — matches browse / landing */
function categoryPillClass(category: string): string {
  const c = category || 'world'
  const map: Record<string, string> = {
    world_cup: 'bg-emerald-500/10 text-emerald-400',
    world: 'bg-blue-500/10 text-blue-400',
    pulse: 'bg-amber-500/10 text-amber-400',
    government: 'bg-amber-500/10 text-amber-400',
    geopolitics: 'bg-sky-500/10 text-sky-400',
    sustainability: 'bg-green-500/10 text-green-400',
    technology: 'bg-violet-500/10 text-violet-400',
    economy: 'bg-teal-500/10 text-teal-400',
    corporate: 'bg-purple-500/10 text-purple-400',
    community: 'bg-pink-500/10 text-pink-400',
    cause: 'bg-amber-500/10 text-amber-400',
    entertainment: 'bg-fuchsia-500/10 text-fuchsia-400',
  }
  return map[c] ?? 'bg-emerald-500/10 text-emerald-400'
}

function categoryLabel(category: string, locale: string): string {
  if (locale === 'es') {
    return CATEGORY_LABELS_ES[category] ?? category.replace(/_/g, ' ')
  }
  return CATEGORY_LABELS_EN[category] ?? category.replace(/_/g, ' ')
}

function formatDeadline(resolutionDate: string, locale: string): string {
  const end = new Date(resolutionDate).getTime()
  const now = Date.now()
  const diffMs = end - now
  if (diffMs <= 0) {
    return locale === 'es' ? 'Cerrado' : 'Closed'
  }
  const hours = diffMs / 3600000
  if (hours < 24) {
    const h = Math.max(1, Math.ceil(hours))
    return locale === 'es' ? `Cierra en ${h}h` : `Closes in ${h}h`
  }
  const days = Math.ceil(diffMs / 86400000)
  return locale === 'es' ? `Cierra en ${days}d` : `Closes in ${days}d`
}

function syntheticBinaryOutcomes(market: MarketCardMarket): MarketCardOutcome[] {
  const p = Number(market.current_probability ?? 0.5)
  return [
    { id: 'syn-yes', label: 'Sí', probability: p, sort_order: 0 },
    { id: 'syn-no', label: 'No', probability: 1 - p, sort_order: 1 },
  ]
}

export function MarketCard({
  market,
  outcomes,
  showCategory = true,
  showDeadline = true,
  showVoteCount = true,
  compact = false,
  /** Public /markets: card links to market detail; footer "Predict" → login with redirect */
  publicPredictCta = false,
  /**
   * When true, always render probability bars regardless of vote count.
   * Use on admin and user-dashboard surfaces where dead markets must be visible.
   */
  showLowEngagementBars = false,
}: {
  market: MarketCardMarket
  outcomes: MarketCardOutcome[]
  showCategory?: boolean
  showDeadline?: boolean
  showVoteCount?: boolean
  compact?: boolean
  publicPredictCta?: boolean
  showLowEngagementBars?: boolean
}) {
  const router = useRouter()
  const { language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const title = getMarketText(market as MarketWithTranslations, 'title', locale)
  const votes = market.total_votes ?? 0
  const isPulse = isPulseLikeMarket(market)
  const voteLabel = voteCountLabelPublic(locale === 'en' ? 'en' : 'es', votes, isPulse)
  const isLowEngagement = !showLowEngagementBars && votes < PUBLIC_MARKET_MIN_VOTES

  const raw =
    outcomes.length > 0
      ? [...outcomes].sort((a, b) => Number(b.probability) - Number(a.probability))
      : syntheticBinaryOutcomes(market)

  const isBinaryLayout = raw.length === 2
  const multiRows = isBinaryLayout ? [] : raw.slice(0, 4)
  const moreCount = !isBinaryLayout && raw.length > 4 ? raw.length - 4 : 0

  const deadline = formatDeadline(market.resolution_date || new Date().toISOString(), locale)

  const detailHref = `/predictions/markets/${market.id}`
  const loginHref = `/login?redirect=${encodeURIComponent(detailHref)}`
  const go = () => router.push(detailHref)

  const pad = compact ? 'p-4' : 'p-5'
  const barHBinary = compact ? 'h-8' : 'h-9'
  const barHMulti = compact ? 'h-6' : 'h-7'
  const labelW = compact ? 'w-20 sm:w-24' : 'w-24 sm:w-28'

  const shellClass = `group rounded-xl border border-cc-border bg-cc-card transition-all duration-200 hover:scale-[1.01] hover:border-emerald-500/30`

  const body = (
    <>
      {showCategory && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryPillClass(market.category)}`}
          >
            {categoryLabel(market.category, locale)}
          </span>
          {market.sponsor_name ? (
            <div className="min-w-0 max-w-[55%] text-right">
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

      <h3
        className={`mb-4 font-semibold leading-snug text-cc-text-primary line-clamp-3 ${
          compact ? 'text-sm' : 'text-base'
        }`}
      >
        {title}
      </h3>

      {isLowEngagement ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-center">
          <p className="text-sm font-medium text-cc-text-primary">
            {locale === 'es' ? 'Sé una de las primeras voces' : 'Be one of the first voices'}
          </p>
          <p className="mt-1 text-xs text-emerald-400">
            {locale === 'es'
              ? `${votes}/${PUBLIC_MARKET_MIN_VOTES} votos para activar resultados`
              : `${votes}/${PUBLIC_MARKET_MIN_VOTES} votes to activate results`}
          </p>
        </div>
      ) : isBinaryLayout ? (
        <div className="grid grid-cols-2 gap-2">
          {raw.map((o) => {
            const pct = Math.round(toDisplayPercent(o.probability))
            const label = getOutcomeLabel(o, locale)
            return (
              <div
                key={o.id}
                className={`relative flex items-center overflow-hidden rounded-lg bg-gray-800/50 px-3 ${barHBinary}`}
              >
                <div
                  className="absolute left-0 top-0 h-full rounded-lg bg-emerald-500/20"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative z-10 flex w-full min-w-0 justify-between gap-1 text-sm">
                  <span className="truncate text-gray-200">{label}</span>
                  <span className="shrink-0 font-semibold text-white">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {multiRows.map((o) => {
            const pct = Math.round(toDisplayPercent(o.probability))
            const label = getOutcomeLabel(o, locale)
            return (
              <div key={o.id} className="flex items-center gap-3">
                <span className={`${labelW} shrink-0 truncate text-sm text-gray-300`}>{label}</span>
                <div className={`relative min-w-0 flex-1 overflow-hidden rounded-lg bg-gray-800/50 ${barHMulti}`}>
                  <div
                    className="absolute left-0 top-0 h-full rounded-lg bg-emerald-500/20"
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

      {(showVoteCount || showDeadline) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-cc-text-muted">
          {showVoteCount && <span>{voteLabel}</span>}
          {showVoteCount && showDeadline && <span aria-hidden>·</span>}
          {showDeadline && <span>{deadline}</span>}
        </div>
      )}
    </>
  )

  if (publicPredictCta) {
    return (
      <div className={`${shellClass} overflow-hidden`}>
        <Link
          href={detailHref}
          className={`block cursor-pointer text-left text-inherit no-underline ${pad} outline-none ring-emerald-500/30 focus-visible:ring-2`}
        >
          {body}
        </Link>
        <div className="border-t border-cc-border px-5 pb-5">
          <Link
            href={loginHref}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            {marketCardPredictCta(locale === 'en' ? 'en' : 'es', isPulse)}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          go()
        }
      }}
      className={`${shellClass} cursor-pointer ${pad}`}
    >
      {body}
    </div>
  )
}
