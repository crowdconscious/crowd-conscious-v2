'use client'

import { getOutcomeLabel } from '@/lib/i18n/market-translations'
import { toDisplayPercentRounded } from '@/lib/probability-utils'
import type { PulseOutcomeRow } from './PulseResultClient'

export default function PulseOutcomeBars({
  outcomes,
  locale,
  className = '',
}: {
  outcomes: PulseOutcomeRow[]
  locale: 'es' | 'en'
  className?: string
}) {
  return (
    <div className={`space-y-5 ${className}`.trim()}>
      {outcomes.map((o) => {
        const pct = toDisplayPercentRounded(o.probability)
        const label = getOutcomeLabel(o, locale)
        return (
          <div key={o.id}>
            <div className="mb-1.5 flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-200">{label}</span>
              <span className="tabular-nums text-emerald-400">{pct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
