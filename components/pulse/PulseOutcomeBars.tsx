'use client'

import {
  getOutcomeLabel,
  getOutcomeSubtitle,
} from '@/lib/i18n/market-translations'
import { toDisplayPercentRounded } from '@/lib/probability-utils'
import type { PulseOutcomeRow } from './PulseResultClient'

/**
 * Defensive: a legacy row may still carry the stuffed-label shape
 * "Label( detail without closing paren" — we don't want to crop the user's
 * text. If the row has no real subtitle but the label opens a paren without
 * closing it, show the label verbatim and skip the subtitle line. (Rows that
 * the admin re-edits through the new form will land here with a clean label
 * and a real subtitle.)
 */
function hasUnclosedParen(label: string): boolean {
  const open = label.indexOf('(')
  if (open < 0) return false
  return label.indexOf(')', open) < 0
}

export default function PulseOutcomeBars({
  outcomes,
  locale,
  className = '',
  // Pre-vote (Pulse share / blog embed) we render only label + subtitle and
  // hide both the per-option percentage AND the bar fill, so visitors can't
  // see the community signal before they cast their own vote. The caller is
  // expected to render a CTA hint nearby.
  revealResults = true,
}: {
  outcomes: PulseOutcomeRow[]
  locale: 'es' | 'en'
  className?: string
  revealResults?: boolean
}) {
  return (
    <div className={`space-y-5 ${className}`.trim()}>
      {outcomes.map((o) => {
        const pct = toDisplayPercentRounded(o.probability)
        const label = getOutcomeLabel(o, locale)
        const subtitle = getOutcomeSubtitle(o, locale)
        const renderSubtitle = subtitle && !hasUnclosedParen(label)
        return (
          <div key={o.id}>
            <div className="mb-1.5 flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-200">{label}</span>
              {revealResults ? (
                <span className="tabular-nums text-emerald-400 animate-[fade-in_300ms_ease-out]">
                  {pct}%
                </span>
              ) : null}
            </div>
            {renderSubtitle ? (
              <p className="mb-1.5 text-sm leading-snug text-gray-400">
                {subtitle}
              </p>
            ) : null}
            {revealResults ? (
              <div className="h-3 w-full overflow-hidden rounded-full bg-black/40 animate-[fade-in_300ms_ease-out]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            ) : (
              <div
                aria-hidden
                className="h-3 w-full overflow-hidden rounded-full bg-white/[0.04] border border-dashed border-white/10"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
