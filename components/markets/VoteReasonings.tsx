'use client'

import { useEffect, useMemo, useState } from 'react'
import { getOutcomeLabel } from '@/lib/i18n/market-translations'

type OutcomeLite = { id: string; label: string; probability: number; translations?: unknown }

type ReasoningRow = {
  id: string
  reasoning: string
  confidence: number
  outcome_id: string
  author_name: string
}

function authorLabel(row: ReasoningRow): { name: string; prefix: string } {
  return { name: row.author_name, prefix: '' }
}

export default function VoteReasonings({
  marketId,
  outcomes,
  locale = 'es',
}: {
  marketId: string
  outcomes: OutcomeLite[]
  locale?: string
}) {
  const [reasonings, setReasonings] = useState<ReasoningRow[]>([])
  const [expandedOutcome, setExpandedOutcome] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchReasonings() {
      const lang = locale === 'en' ? 'en' : 'es'
      const res = await fetch(
        `/api/predictions/markets/${encodeURIComponent(marketId)}/vote-reasonings?lang=${lang}`,
        { cache: 'no-store' }
      )
      if (!res.ok || cancelled) {
        if (!res.ok) console.error('[VoteReasonings]', res.status)
        return
      }
      const json = (await res.json()) as { reasonings?: ReasoningRow[] }
      const rows = (json.reasonings ?? []).filter((r) => (r.reasoning ?? '').trim() !== '')
      setReasonings(rows)
      if (rows.length > 0) {
        const ids = new Set(rows.map((r) => r.outcome_id))
        if (ids.size === 1) {
          setExpandedOutcome([...ids][0] ?? null)
        }
      }
    }
    void fetchReasonings()
    return () => {
      cancelled = true
    }
  }, [marketId, locale])

  const byOutcome = useMemo(() => {
    return outcomes
      .map((o) => ({
        ...o,
        reasonings: reasonings.filter((r) => r.outcome_id === o.id),
      }))
      .filter((o) => o.reasonings.length > 0)
  }, [outcomes, reasonings])

  if (reasonings.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="mb-4 text-sm font-bold text-white">
        {locale === 'es'
          ? `💬 Por qué votaron así (${reasonings.length})`
          : `💬 Why they voted this way (${reasonings.length})`}
      </h3>

      <div className="space-y-4">
        {byOutcome.map((outcome) => {
          const expanded = expandedOutcome === outcome.id
          const showCount = expanded ? 20 : 3
          const label = getOutcomeLabel(outcome, locale).split(' / ')[0]
          return (
            <div key={outcome.id}>
              <button
                type="button"
                onClick={() =>
                  setExpandedOutcome(expanded ? null : outcome.id)
                }
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{label}</span>
                  <span className="text-xs text-gray-500">
                    {outcome.reasonings.length}{' '}
                    {locale === 'es' ? 'razones' : 'reasons'}
                  </span>
                </div>
                <span className="text-xs text-gray-600">{expanded ? '▲' : '▼'}</span>
              </button>

              {(expanded || byOutcome.length === 1) && (
                <div className="mt-2 space-y-2 pl-2">
                  {outcome.reasonings.slice(0, showCount).map((r) => {
                    const { name, prefix } = authorLabel(r)
                    const handle = `@${name.toLowerCase().replace(/\s+/g, '_')}`
                    return (
                      <div
                        key={r.id}
                        className="reasoning-card rounded-r-lg border-l-2 border-emerald-500/40 bg-white/[0.03] px-3 py-2.5"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-400">
                            {prefix}
                            {handle}
                          </span>
                          <span className="text-xs text-gray-600">
                            {typeof r.confidence === 'number' ? r.confidence : '—'}/10
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-300">&ldquo;{r.reasoning}&rdquo;</p>
                      </div>
                    )
                  })}

                  {!expanded && outcome.reasonings.length > showCount && (
                    <button
                      type="button"
                      onClick={() => setExpandedOutcome(outcome.id)}
                      className="text-xs text-emerald-400/60 hover:text-emerald-400"
                    >
                      +{outcome.reasonings.length - showCount}{' '}
                      {locale === 'es' ? 'más' : 'more'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
