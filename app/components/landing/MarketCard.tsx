'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  getMarketText,
  getOutcomeLabel,
  type MarketWithTranslations,
} from '@/lib/i18n/market-translations'
import { toDisplayPercent } from '@/lib/probability-utils'
import { SponsorBadge } from '@/components/SponsorBadge'

export type MarketCardMarket = {
  id: string
  title: string
  translations?: unknown
  total_votes: number | null
  current_probability: number
  category: string
  market_type?: string | null
  resolution_date: string
  status?: string
  sponsor_name?: string | null
  sponsor_logo_url?: string | null
  sponsor_url?: string | null
  image_url?: string | null
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
  government: 'Gobierno',
  corporate: 'Corporativo',
  community: 'Comunidad',
  cause: 'Causa',
  world_cup: 'Mundial',
  sustainability: 'Sostenibilidad',
}

const CATEGORY_LABELS_EN: Record<string, string> = {
  world: 'World',
  government: 'Government',
  corporate: 'Corporate',
  community: 'Community',
  cause: 'Cause',
  world_cup: 'World Cup',
  sustainability: 'Sustainability',
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
}: {
  market: MarketCardMarket
  outcomes: MarketCardOutcome[]
}) {
  const router = useRouter()
  const { language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const title = getMarketText(market as MarketWithTranslations, 'title', locale)
  const votes = market.total_votes ?? 0
  const voteLabel =
    locale === 'es'
      ? `${votes.toLocaleString('es-MX')} votos`
      : `${votes.toLocaleString('en-US')} votes`

  const raw =
    outcomes.length > 0
      ? [...outcomes].sort((a, b) => Number(b.probability) - Number(a.probability))
      : syntheticBinaryOutcomes(market)

  const isBinaryLayout = raw.length === 2
  const multiRows = isBinaryLayout ? [] : raw.slice(0, 4)
  const moreCount = !isBinaryLayout && raw.length > 4 ? raw.length - 4 : 0

  const deadline = formatDeadline(market.resolution_date || new Date().toISOString(), locale)

  const go = () => router.push(`/predictions/markets/${market.id}`)

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
      className="group cursor-pointer rounded-xl border border-gray-800 bg-[#1a2029] p-5 transition-all duration-200 hover:scale-[1.01] hover:border-emerald-500/30"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
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

      <h3 className="mb-4 text-base font-semibold leading-snug text-white line-clamp-3">{title}</h3>

      {isBinaryLayout ? (
        <div className="grid grid-cols-2 gap-2">
          {raw.map((o) => {
            const pct = Math.round(toDisplayPercent(o.probability))
            const label = getOutcomeLabel(o, locale)
            return (
              <div
                key={o.id}
                className="relative flex h-8 items-center overflow-hidden rounded-lg bg-gray-800/50 px-3"
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
        <div className="space-y-2">
          {multiRows.map((o) => {
            const pct = Math.round(toDisplayPercent(o.probability))
            const label = getOutcomeLabel(o, locale)
            return (
              <div key={o.id} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-sm text-gray-200 sm:w-28">{label}</span>
                <div className="relative h-8 min-w-0 flex-1 overflow-hidden rounded-lg bg-gray-800/50">
                  <div
                    className="absolute left-0 top-0 h-full rounded-lg bg-emerald-500/20"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative z-10 flex h-full items-center justify-end px-2">
                    <span className="text-sm font-semibold text-white">{pct}%</span>
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

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{voteLabel}</span>
        <span aria-hidden>·</span>
        <span>{deadline}</span>
      </div>
    </div>
  )
}
