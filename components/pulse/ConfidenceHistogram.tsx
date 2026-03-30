'use client'

type VoteLike = { confidence: number | null }

export default function ConfidenceHistogram({ votes }: { votes: VoteLike[] }) {
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
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Distribución de confianza</h3>
      <div className="flex h-28 items-end gap-1">
        {confDist.map((count, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 flex-col justify-end">
              <div
                className="w-full rounded-t bg-emerald-500/40 transition-all"
                style={{
                  height: `${(count / maxCount) * 100}%`,
                  minHeight: count > 0 ? 4 : 0,
                }}
              />
            </div>
            <span className="text-[10px] text-gray-500">{i + 1}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">Nivel de confianza (1–10)</p>
      <div className="mt-3 space-y-1 text-sm text-gray-300">
        <p>
          Promedio:{' '}
          <span className="text-emerald-400">{n > 0 ? `${avg.toFixed(1)}/10` : '—'}</span>
        </p>
        <p>
          Opiniones fuertes (≥8): <span className="text-emerald-400">{strong}</span>
        </p>
        <p>
          Opiniones débiles (≤3): <span className="text-amber-400/90">{weak}</span>
        </p>
      </div>
    </div>
  )
}
