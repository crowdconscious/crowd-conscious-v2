'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { toDisplayPercent, toDisplayPercentRounded } from '@/lib/probability-utils'
import { Loader2 } from 'lucide-react'

type OutcomeRow = { id: string; label: string; probability: number }

export function EmbeddedMarketCard({
  marketId,
  locale = 'es',
}: {
  marketId: string
  locale?: 'en' | 'es'
}) {
  const es = locale === 'es'
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [votes, setVotes] = useState<number | null>(null)
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    async function load() {
      setLoading(true)
      setErr(null)
      const { data: m, error: e1 } = await supabase
        .from('prediction_markets')
        .select('id, title, total_votes, engagement_count, status, translations')
        .eq('id', marketId)
        .maybeSingle()
      if (e1 || !m) {
        if (!cancelled) setErr(es ? 'Mercado no disponible' : 'Market unavailable')
        setLoading(false)
        return
      }
      const { data: o, error: e2 } = await supabase
        .from('market_outcomes')
        .select('id, label, probability')
        .eq('market_id', marketId)
        .order('probability', { ascending: false })
      if (e2) {
        if (!cancelled) setErr(es ? 'No se cargaron resultados' : 'Could not load outcomes')
        setLoading(false)
        return
      }
      if (!cancelled) {
        const tr = m.translations as { en?: { title?: string } } | null
        const enTitle = tr?.en?.title?.trim()
        setTitle(!es && enTitle ? enTitle : m.title)
        setVotes(Number(m.total_votes ?? m.engagement_count ?? 0))
        setOutcomes((o ?? []) as OutcomeRow[])
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [marketId, es])

  const shown = outcomes.slice(0, 4)
  const more = outcomes.length - shown.length

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-emerald-500/20 bg-[#1a2029] p-6">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500/80" />
      </div>
    )
  }

  if (err || !title) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#1a2029] p-4 text-sm text-slate-500">
        {err ?? (es ? 'Mercado no encontrado' : 'Market not found')}
      </div>
    )
  }

  return (
    <div className="my-6 rounded-xl border border-emerald-500/20 bg-[#1a2029] p-5 shadow-lg shadow-black/20">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
        {es ? 'Mercado relacionado' : 'Related market'}
      </p>
      <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>
      <ul className="mt-4 space-y-3">
        {shown.map((o) => (
          <li key={o.id}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-gray-300 line-clamp-2">{o.label}</span>
              <span className="shrink-0 tabular-nums text-emerald-400/90">
                {toDisplayPercentRounded(Number(o.probability))}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-emerald-500/50"
                style={{ width: `${Math.min(100, toDisplayPercent(Number(o.probability)))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          +{more} {es ? 'más' : 'more'}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500">
        {votes ?? 0} {es ? 'votos' : 'votes'}
      </p>
      <Link
        href={`/predictions/markets/${marketId}`}
        className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-500"
      >
        {es ? 'Votar →' : 'Vote →'}
      </Link>
    </div>
  )
}
