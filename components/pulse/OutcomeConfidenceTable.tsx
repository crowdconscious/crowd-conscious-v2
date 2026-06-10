'use client'

import {
  outcomeAvgConfidence,
  type PulseOutcomeVoteStats,
} from '@/lib/pulse-vote-aggregates'

type Outcome = { id: string; label: string }

export default function OutcomeConfidenceTable({
  outcomes,
  statsByOutcome,
  locale,
}: {
  outcomes: Outcome[]
  statsByOutcome: Record<string, PulseOutcomeVoteStats>
  locale: 'es' | 'en'
}) {
  const rows = outcomes.map((o) => {
    const stats = statsByOutcome[o.id]
    return {
      label: o.label,
      avg: outcomeAvgConfidence(stats),
      count: stats?.count ?? 0,
    }
  })

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        {locale === 'es' ? 'Confianza promedio por resultado' : 'Average confidence per outcome'}
      </h3>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex justify-between gap-4 text-slate-300">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="shrink-0 text-emerald-400">
              {r.count === 0 || r.avg == null
                ? '—'
                : locale === 'es'
                  ? `${r.avg.toFixed(1)}/10 (${r.count} votos)`
                  : `${r.avg.toFixed(1)}/10 (${r.count} votes)`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
