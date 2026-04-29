'use client'

import {
  getOutcomeLabel,
  getOutcomeSubtitle,
} from '@/lib/i18n/market-translations'
import { toDisplayPercentRounded } from '@/lib/probability-utils'

/**
 * PulseResultsCard
 *
 * Single, consolidated post-vote results visualization. Replaces the older
 * trio of "Probabilidad de la comunidad" headline + donut + horizontal
 * stacked bar that used to live on MarketDetailClient and PulseResultClient.
 *
 * Layout (mobile-first, max-w-2xl on desktop):
 *
 *   Resultados
 *   {N} votos · confianza promedio {X}/10
 *   ────────────────────────────────────
 *   <option title>                 {pct}%
 *   ▓▓▓▓▓▓▓▓▓▓░░░░░░░
 *   <option subtitle, muted>
 *
 *   <option title>                 {pct}%
 *   ▓▓▓▓▓░░░░░░░░░░░░
 *   <option subtitle, muted>
 *
 * Sorted descending by probability. Winning row uses the primary emerald
 * gradient; the rest use a neutral track so the eye lands on the leader
 * without producing a rainbow.
 *
 * Defensive against legacy "stuffed-label" rows where the subtitle was
 * jammed into the label as `Label(detail without close paren`. Same logic
 * as PulseOutcomeBars: if the label has an unclosed `(`, we don't render
 * the (likely-truncated) subtitle, since the user's text is already in
 * the label and clipping it would lose information.
 */
type PulseResultsCardOutcome = {
  id: string
  label: string
  subtitle?: string | null
  /** Stored 0..1 (current_probability) */
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
  const voteWord =
    locale === 'es'
      ? totalVotes === 1
        ? 'voto'
        : 'votos'
      : totalVotes === 1
        ? 'vote'
        : 'votes'
  const confLabel = locale === 'es' ? 'confianza promedio' : 'avg confidence'
  const totalStr = totalVotes.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')
  if (
    typeof avgConfidence === 'number' &&
    Number.isFinite(avgConfidence) &&
    totalVotes > 0
  ) {
    return `${totalStr} ${voteWord} · ${confLabel} ${avgConfidence.toFixed(1)}/10`
  }
  return `${totalStr} ${voteWord}`
}

export default function PulseResultsCard({
  outcomes,
  totalVotes,
  avgConfidence,
  locale,
  className = '',
}: {
  outcomes: PulseResultsCardOutcome[]
  totalVotes: number
  avgConfidence?: number | null
  locale: 'es' | 'en'
  className?: string
}) {
  const sorted = [...outcomes].sort((a, b) => {
    const ap = Number(a.probability ?? 0)
    const bp = Number(b.probability ?? 0)
    return bp - ap
  })
  const probs = sorted.map((o) => Number(o.probability ?? 0))
  const maxP = probs.length ? Math.max(...probs) : 0
  const minP = probs.length ? Math.min(...probs) : 0
  const tied = sorted.length >= 2 && maxP === minP
  // Only highlight a winner when there's an actual leader. If everyone is
  // tied, render every row in the muted style — calling one a "winner" by
  // sort order would be misleading.
  const winnerId = !tied && sorted.length ? sorted[0].id : null

  const subtitleLine = formatSubtitle(totalVotes, avgConfidence, locale)
  const heading = locale === 'es' ? 'Resultados' : 'Results'

  return (
    <section
      className={`rounded-2xl border border-white/10 bg-cc-card p-5 sm:p-6 ${className}`.trim()}
      aria-label={heading}
    >
      <header className="mb-5">
        <h3 className="text-lg font-semibold text-white">{heading}</h3>
        <p className="mt-1 text-sm text-gray-400">{subtitleLine}</p>
      </header>
      <ul className="space-y-5">
        {sorted.map((o) => {
          const pct = toDisplayPercentRounded(o.probability)
          const label = getOutcomeLabel(o, locale)
          const subtitle = getOutcomeSubtitle(o, locale)
          const renderSubtitle = subtitle && !hasUnclosedParen(label)
          const isWinner = o.id === winnerId
          return (
            <li key={o.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm sm:text-base">
                <span className="font-medium text-white break-words pr-2">
                  {label}
                </span>
                <span className="shrink-0 tabular-nums font-semibold text-white">
                  {pct}%
                </span>
              </div>
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-black/40"
                role="progressbar"
                aria-valuenow={pct}
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
                  style={{ width: `${pct}%` }}
                />
              </div>
              {renderSubtitle ? (
                <p className="mt-1.5 text-sm leading-snug text-gray-500">
                  {subtitle}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
