'use client'

import {
  histogramConfidenceSum,
  histogramCountAtLeast,
  histogramCountAtMost,
  histogramValidCount,
} from '@/lib/pulse-vote-aggregates'

/** Fixed chart height (px) so bar heights resolve in print (flex % heights often collapse). */
const BAR_AREA_PX = 112

export default function ConfidenceHistogram({
  histogram,
  locale = 'es',
}: {
  /** Index 0 = confidence 1 … index 9 = confidence 10. */
  histogram: number[]
  locale?: 'es' | 'en'
}) {
  const es = locale === 'es'
  const n = histogramValidCount(histogram)
  const avg = n > 0 ? histogramConfidenceSum(histogram) / n : 0
  const strong = histogramCountAtLeast(histogram, 8)
  const weak = histogramCountAtMost(histogram, 3)
  const maxCount = Math.max(...histogram, 1)

  return (
    <div className="pulse-section chart-container rounded-xl border border-white/10 bg-black/20 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        {es ? 'Distribución de confianza' : 'Confidence distribution'}
      </h3>
      <div className="flex h-28 items-end gap-1">
        {histogram.map((count, i) => {
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
