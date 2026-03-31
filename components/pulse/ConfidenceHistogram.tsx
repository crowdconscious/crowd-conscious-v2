'use client'

type VoteLike = { confidence: number | null }

/** Fixed chart height (px) so bar heights resolve in print (flex % heights often collapse). */
const BAR_AREA_PX = 112

export default function ConfidenceHistogram({
  votes,
  locale = 'es',
}: {
  votes: VoteLike[]
  locale?: 'es' | 'en'
}) {
  const es = locale === 'es'
  const confDist = Array.from({ length: 10 }, () => 0)
  let sum = 0
  let n = 0
  let strong = 0
  let weak = 0
  for (const v of votes) {
    const c = typeof v.confidence === 'number' ? v.confidence : 0
    if (c >= 1 && c <= 10) {
      confDist[c - 1]++
      sum += c
      n++
      if (c >= 8) strong++
      if (c <= 3) weak++
    }
  }
  const maxCount = Math.max(...confDist, 1)
  const avg = n > 0 ? sum / n : 0

  return (
    <div className="pulse-section chart-container rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        {es ? 'Distribución de confianza' : 'Confidence distribution'}
      </h3>
      <div className="flex h-28 items-end gap-1">
        {confDist.map((count, i) => {
          const barPx =
            maxCount > 0 ? Math.round((count / maxCount) * BAR_AREA_PX) : 0
          const h = count > 0 ? Math.max(barPx, 4) : 0
          return (
            <div
              key={i}
              className="flex h-28 min-w-0 flex-1 flex-col items-stretch justify-end"
            >
              <div className="flex min-h-0 flex-1 flex-col justify-end">
                <div
                  className="w-full rounded-t bg-emerald-500/40"
                  style={{ height: h, minHeight: h }}
                />
              </div>
              <span className="pt-1 text-center text-[10px] text-gray-500">{i + 1}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">
        {es ? 'Nivel de confianza (1–10)' : 'Confidence level (1–10)'}
      </p>
      <div className="mt-3 space-y-1 text-sm text-gray-300">
        <p>
          {es ? 'Promedio' : 'Average'}:{' '}
          <span className="text-emerald-400">{n > 0 ? `${avg.toFixed(1)}/10` : '—'}</span>
        </p>
        <p>
          {es ? 'Opiniones fuertes (≥8)' : 'Strong opinions (≥8)'}:{' '}
          <span className="text-emerald-400">{strong}</span>
        </p>
        <p>
          {es ? 'Opiniones débiles (≤3)' : 'Weak opinions (≤3)'}:{' '}
          <span className="text-amber-400/90">{weak}</span>
        </p>
      </div>
    </div>
  )
}
