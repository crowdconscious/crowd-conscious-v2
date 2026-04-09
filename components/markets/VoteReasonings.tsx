'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { getOutcomeLabel } from '@/lib/i18n/market-translations'

type OutcomeLite = { id: string; label: string; probability: number; translations?: unknown }

type ReasoningRow = {
  id: string
  reasoning: string
  confidence: number | null
  outcome_id: string
  user_id: string | null
  anonymous_participant_id: string | null
  is_anonymous?: boolean | null
  created_at: string
  profiles?: { full_name?: string | null; avatar_url?: string | null } | null
  anonymous_participants?: { alias?: string | null; avatar_emoji?: string | null } | null
}

function authorLabel(
  row: ReasoningRow,
  locale: string
): { name: string; prefix: string } {
  const prof = row.profiles
  const ap = row.anonymous_participants
  if (prof?.full_name?.trim()) {
    return { name: prof.full_name.trim(), prefix: '' }
  }
  if (ap?.alias?.trim()) {
    const em =
      ap.avatar_emoji && !String(ap.avatar_emoji).startsWith('http')
        ? `${ap.avatar_emoji} `
        : ''
    return { name: ap.alias.trim(), prefix: em }
  }
  return {
    name: locale === 'es' ? 'Invitado' : 'Guest',
    prefix: '',
  }
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
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false
    async function fetchReasonings() {
      const { data, error } = await supabase
        .from('market_votes')
        .select(
          `
          id, reasoning, confidence, outcome_id, user_id, anonymous_participant_id,
          is_anonymous, created_at,
          profiles ( full_name, avatar_url ),
          anonymous_participants ( alias, avatar_emoji )
        `
        )
        .eq('market_id', marketId)
        .not('reasoning', 'is', null)
        .order('created_at', { ascending: false })

      if (error || !data || cancelled) {
        if (error) console.error('[VoteReasonings]', error)
        return
      }
      const rows = (data as ReasoningRow[]).filter((r) => (r.reasoning ?? '').trim() !== '')
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
  }, [marketId, supabase])

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
                    const { name, prefix } = authorLabel(r, locale)
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
