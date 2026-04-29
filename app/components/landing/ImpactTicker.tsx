'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

function useCountUp(target: number, durationMs: number, enabled: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!enabled || target <= 0) {
      setValue(target)
      return
    }
    setValue(0)
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) * (1 - t)
      setValue(Math.round(eased * target))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, enabled])
  return value
}

function formatMoney(n: number, locale: string): string {
  if (locale === 'es') {
    return `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
  }
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/**
 * ImpactTicker — "[N] votos este ciclo → $X para [cause]".
 *
 * `totalVotes` is the `cycle_opinions` metric (market_votes created during
 * the current calendar month, matching `fund_votes.cycle`). See
 * `docs/METRICS-CATALOG.md` + `lib/i18n/metrics.ts`. We deliberately do NOT
 * show all-time engagement here — the narrative is "this cycle → this
 * allocation" and mixing horizons makes the line feel like marketing.
 *
 * `activeCauseSlug`, when present, makes the cause name a link to
 * `/fund/causes/[slug]`. The link is the credibility win: a visitor who
 * wonders "is that cause real?" can tap in and see the organization.
 */
export function ImpactTicker({
  totalVotes,
  fundTotal,
  activeCauseName,
  activeCauseSlug,
}: {
  totalVotes: number
  fundTotal: number
  activeCauseName?: string | null
  activeCauseSlug?: string | null
}) {
  const { language } = useLanguage()
  const locale = language === 'en' ? 'en' : 'es'
  const fundRounded = Math.round(fundTotal)
  const hasVotes = totalVotes > 0
  const hasFund = fundRounded > 0
  const displayVotes = useCountUp(totalVotes, 1500, hasVotes)
  const displayFund = useCountUp(fundRounded, 1500, hasFund)

  if (!hasVotes && !hasFund) {
    return (
      <div className="border-b border-cc-border/50 bg-cc-card/60 px-4 py-2">
        <p className="text-center text-xs text-gray-400 md:text-sm">
          {locale === 'es'
            ? 'Sé el primero en votar — cada voto cuenta'
            : 'Be the first to vote — every vote counts'}
        </p>
      </div>
    )
  }

  const causeFallback = locale === 'es' ? 'causas activas' : 'active causes'
  const causeLabel = activeCauseName?.trim() || causeFallback

  const causeNode = activeCauseSlug ? (
    <Link
      href={`/fund/causes/${activeCauseSlug}`}
      className="text-gray-300 underline decoration-dotted underline-offset-2 hover:text-emerald-300 hover:decoration-emerald-400"
    >
      {causeLabel}
    </Link>
  ) : (
    <span className="text-gray-300">{causeLabel}</span>
  )

  const opinionsEs = locale === 'es' ? 'votos este ciclo' : 'votes this cycle'

  if (hasVotes && !hasFund) {
    return (
      <div className="border-b border-cc-border/50 bg-gray-800/30 px-4 py-2">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-gray-400 md:text-sm">
          <Globe className="h-4 w-4 shrink-0 text-emerald-500/80" aria-hidden />
          <span>
            {locale === 'es' ? (
              <>
                <span className="font-medium text-gray-200">
                  {displayVotes.toLocaleString('es-MX')}
                </span>{' '}
                {opinionsEs}
                {' generando impacto para '}
                {causeNode}
              </>
            ) : (
              <>
                <span className="font-medium text-gray-200">
                  {displayVotes.toLocaleString('en-US')}
                </span>{' '}
                {opinionsEs}
                {' driving impact for '}
                {causeNode}
              </>
            )}
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className="border-b border-cc-border/50 bg-gray-800/30 px-4 py-2">
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-gray-400 md:text-sm">
        <Globe className="h-4 w-4 shrink-0 text-emerald-500/80" aria-hidden />
        <span>
          {locale === 'es' ? (
            <>
              <span className="font-medium text-gray-200">
                {displayVotes.toLocaleString('es-MX')}
              </span>{' '}
              {opinionsEs}
              {' → '}
              <span className="font-semibold text-emerald-400">
                {formatMoney(displayFund, locale)}
              </span>
              {' para '}
              {causeNode}
            </>
          ) : (
            <>
              <span className="font-medium text-gray-200">
                {displayVotes.toLocaleString('en-US')}
              </span>{' '}
              {opinionsEs} →{' '}
              <span className="font-semibold text-emerald-400">
                {formatMoney(displayFund, locale)}
              </span>
              {' for '}
              {causeNode}
            </>
          )}
        </span>
      </p>
    </div>
  )
}
