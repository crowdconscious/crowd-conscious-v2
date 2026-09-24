'use client'

import {
  getOutcomeLabel,
  getOutcomeSubtitle,
} from '@/lib/i18n/market-translations'
import { toDisplayPercentRounded } from '@/lib/probability-utils'
import {
  formatParticipationCount,
  shouldRevealCount,
} from '@/lib/display/participation'
import { lowNRevealCopy } from '@/lib/post-vote-reveal'
import {
  outcomeAvgConfidence,
  outcomeChooserShare,
  type PulseOutcomeVoteStats,
} from '@/lib/pulse-vote-aggregates'
import type { VoteMode } from '@/lib/pulse-vote-ranking'

/**
 * PulseResultsCard
 *
 * Single, consolidated post-vote results visualization. Replaces the older
 * trio of "Probabilidad de la comunidad" headline + donut + horizontal
 * stacked bar that used to live on MarketDetailClient and PulseResultClient.
 *
 * Below PARTICIPATION_REVEAL_THRESHOLD: first-voices / "Votación abierta"
 * only — never option %, bars, or a thin raw count (density honesty §3.3).
 *
 * Multi mode: headline % = share of people who chose the option (does NOT
 * sum to 100). Labelled "eligieron". Options with 0 pickers are omitted.
 */
type PulseResultsCardOutcome = {
  id: string
  label: string
  subtitle?: string | null
  /** Stored 0..1 (current_probability) — certainty share for single/ranked. */
  probability: number
  vote_count?: number | null
  translations?: unknown
}

function hasUnclosedParen(label: string): boolean {
  const open = label.indexOf('(')
  if (open < 0) return false
  return label.indexOf(')', open) < 0
}

function formatSubtitle(
  totalVotes: number,
  avgConfidence: number | null | undefined,
  locale: 'es' | 'en'
): string {
  if (!shouldRevealCount(totalVotes)) {
    return formatParticipationCount(totalVotes, locale)
  }
  const countStr = formatParticipationCount(totalVotes, locale)
  const confLabel = locale === 'es' ? 'confianza promedio' : 'avg confidence'
  if (typeof avgConfidence === 'number' && Number.isFinite(avgConfidence)) {
    return `${countStr} · ${confLabel} ${avgConfidence.toFixed(1)}/10`
  }
  return countStr
}

export default function PulseResultsCard({
  outcomes,
  totalVotes,
  avgConfidence,
  locale,
  className = '',
  voteMode = 'single',
  byOutcome,
}: {
  outcomes: PulseResultsCardOutcome[]
  totalVotes: number
  avgConfidence?: number | null
  locale: 'es' | 'en'
  className?: string
  voteMode?: VoteMode
  byOutcome?: Record<string, PulseOutcomeVoteStats>
}) {
  const lowN = !shouldRevealCount(totalVotes)
  const lowNCopy = lowNRevealCopy(locale)
  const isMulti = voteMode === 'multi'

  if (lowN) {
    const heading = locale === 'es' ? 'Resultados' : 'Results'
    return (
      <section
        className={`rounded-2xl border border-white/10 bg-cc-card p-5 sm:p-6 ${className}`.trim()}
        aria-label={heading}
      >
        <header className="mb-3">
          <h3 className="text-lg font-semibold text-white">{lowNCopy.headline}</h3>
          <p className="mt-2 text-sm text-slate-300 leading-snug">{lowNCopy.body}</p>
          <p className="mt-3 text-sm text-gray-400">
            {formatParticipationCount(totalVotes, locale)}
          </p>
        </header>
      </section>
    )
  }

  type Row = {
    id: string
    outcome: PulseResultsCardOutcome
    barPct: number
    headlinePct: number
    avgConf: number | null
    sortKey: number
  }

  const rows: Row[] = outcomes
    .map((o) => {
      const stats = byOutcome?.[o.id]
      if (isMulti) {
        const count = stats?.count ?? 0
        if (count <= 0) return null
        const share = outcomeChooserShare(stats, totalVotes) ?? 0
        const pct = Math.round(share * 100)
        return {
          id: o.id,
          outcome: o,
          barPct: pct,
          headlinePct: pct,
          avgConf: outcomeAvgConfidence(stats),
          sortKey: count,
        }
      }
      const prob = Number(o.probability ?? 0)
      return {
        id: o.id,
        outcome: o,
        barPct: toDisplayPercentRounded(prob),
        headlinePct: toDisplayPercentRounded(prob),
        avgConf: outcomeAvgConfidence(stats),
        sortKey: prob,
      }
    })
    .filter((r): r is Row => r != null)
    .sort((a, b) => b.sortKey - a.sortKey)

  const maxKey = rows.length ? Math.max(...rows.map((r) => r.sortKey)) : 0
  const minKey = rows.length ? Math.min(...rows.map((r) => r.sortKey)) : 0
  const tied = rows.length >= 2 && maxKey === minKey
  const winnerId = !tied && rows.length ? rows[0].id : null

  const subtitleLine = formatSubtitle(totalVotes, avgConfidence, locale)
  const heading = locale === 'es' ? 'Resultados' : 'Results'
  const multiHint =
    locale === 'es'
      ? 'Porcentaje de personas que eligieron cada opción (puede sumar más de 100%).'
      : 'Share of people who chose each option (can sum to more than 100%).'

  return (
    <section
      className={`rounded-2xl border border-white/10 bg-cc-card p-5 sm:p-6 ${className}`.trim()}
      aria-label={heading}
    >
      <header className="mb-5">
        <h3 className="text-lg font-semibold text-white">{heading}</h3>
        <p className="mt-1 text-sm text-gray-400">{subtitleLine}</p>
        {isMulti ? (
          <p className="mt-1.5 text-[11px] text-slate-500">{multiHint}</p>
        ) : null}
      </header>
      <ul className="space-y-5">
        {rows.map((r) => {
          const label = getOutcomeLabel(r.outcome, locale)
          const subtitle = getOutcomeSubtitle(r.outcome, locale)
          const renderSubtitle = subtitle && !hasUnclosedParen(label)
          const isWinner = r.id === winnerId
          const pctLabel = isMulti
            ? locale === 'es'
              ? `${r.headlinePct}% eligieron`
              : `${r.headlinePct}% chose`
            : `${r.headlinePct}%`
          return (
            <li key={r.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm sm:text-base">
                <span className="font-medium text-white break-words pr-2">
                  {label}
                </span>
                <span className="shrink-0 tabular-nums font-semibold text-white">
                  {pctLabel}
                </span>
              </div>
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-black/40"
                role="progressbar"
                aria-valuenow={r.barPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isWinner
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      : 'bg-white/15'
                  }`}
                  style={{ width: `${Math.min(100, r.barPct)}%` }}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-500">
                {renderSubtitle ? (
                  <span className="leading-snug">{subtitle}</span>
                ) : null}
                {r.avgConf != null ? (
                  <span className="tabular-nums">
                    {locale === 'es' ? 'certeza' : 'certainty'} {r.avgConf.toFixed(1)}
                    /10
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
