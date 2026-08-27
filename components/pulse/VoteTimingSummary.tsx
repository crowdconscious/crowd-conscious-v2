'use client'

import { useMemo } from 'react'
import {
  formatVoteTimestampCdmx,
  hourLabel,
  summarizeVoteTiming,
  weekdayLabel,
  type VoteTimingLike,
} from '@/lib/pulse-vote-timing'

/**
 * Compact CDMX timing strip for admin/sponsor enhanced view.
 * Complements VoteTimeline (arrival curve) with “when in the week/day”.
 */
export default function VoteTimingSummary({
  votes,
  locale = 'es',
  openAt,
  closeAt,
}: {
  votes: VoteTimingLike[]
  locale?: 'es' | 'en'
  /** Pulse open / published timestamp (ISO), optional duration context. */
  openAt?: string | null
  /** Pulse resolution_date (ISO). */
  closeAt?: string | null
}) {
  const es = locale === 'es'
  const summary = useMemo(() => summarizeVoteTiming(votes), [votes])

  if (summary.total === 0) return null

  const peakHour =
    summary.peakHour != null ? hourLabel(summary.peakHour, locale) : '—'
  const peakDay =
    summary.peakWeekday != null
      ? weekdayLabel(summary.peakWeekday, locale)
      : '—'

  const durationLine = (() => {
    if (!openAt || !closeAt) return null
    const open = new Date(openAt).getTime()
    const close = new Date(closeAt).getTime()
    if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open) return null
    const days = (close - open) / 86_400_000
    const daysLabel =
      days >= 1
        ? es
          ? `${days.toFixed(1)} días`
          : `${days.toFixed(1)} days`
        : es
          ? `${Math.round(days * 24)} h`
          : `${Math.round(days * 24)} h`
    return es
      ? `Duración del Pulse: ${daysLabel} · abierto ${formatVoteTimestampCdmx(openAt, locale)} → cierra ${formatVoteTimestampCdmx(closeAt, locale)}`
      : `Pulse duration: ${daysLabel} · open ${formatVoteTimestampCdmx(openAt, locale)} → closes ${formatVoteTimestampCdmx(closeAt, locale)}`
  })()

  return (
    <div className="pulse-section chart-container rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="mb-2 text-sm font-semibold text-white">
        {es ? 'Cuándo votan (hora CDMX)' : 'When people vote (CDMX time)'}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {es ? 'Hora pico' : 'Peak hour'}
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-400">
            {peakHour}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {es ? 'Día pico' : 'Peak day'}
          </p>
          <p className="mt-0.5 text-lg font-semibold capitalize text-emerald-400">
            {peakDay}
          </p>
        </div>
      </div>
      {durationLine ? (
        <p className="mt-3 text-xs text-slate-500">{durationLine}</p>
      ) : null}
      <p className="mt-2 text-xs text-slate-500">
        {es
          ? 'Usa created_at (primer voto). Para marketing: exporta CSV y corta antes/después de la campaña.'
          : 'Uses created_at (first vote). For marketing: export CSV and cut before/after the campaign.'}
      </p>
    </div>
  )
}
