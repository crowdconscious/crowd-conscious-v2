'use client'

type Outcome = { id: string; label: string }
type Vote = { outcome_id: string; confidence: number | null }

export default function OutcomeConfidenceTable({
  outcomes,
  votes,
  locale,
}: {
  outcomes: Outcome[]
  votes: Vote[]
  locale: 'es' | 'en'
}) {
  const rows = outcomes.map((o) => {
    const vs = votes.filter((v) => v.outcome_id === o.id)
    const confs = vs
      .map((v) => (typeof v.confidence === 'number' ? v.confidence : 0))
      .filter((c) => c >= 1 && c <= 10)
    const avg: number | null = confs.length
      ? confs.reduce((a, b) => a + b, 0) / confs.length
      : null
    return { label: o.label, avg, count: vs.length }
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
