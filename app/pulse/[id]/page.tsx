import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getMarketText, getOutcomeLabel } from '@/lib/i18n/market-translations'
import { toDisplayPercentRounded } from '@/lib/probability-utils'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: market } = await supabase
    .from('prediction_markets')
    .select('title, translations, pulse_client_name, is_pulse')
    .eq('id', id)
    .maybeSingle()

  if (!market || !market.is_pulse) {
    return { title: 'Conscious Pulse' }
  }

  const title = getMarketText(
    {
      title: market.title,
      translations: market.translations as Parameters<typeof getMarketText>[0]['translations'],
    },
    'title',
    'es'
  )
  const client = market.pulse_client_name?.trim()
  const pageTitle = client ? `${title} · ${client}` : title

  return {
    title: `${pageTitle} | Conscious Pulse`,
    description: `Resultados — ${title}. Medición de sentimiento público. Powered by Crowd Conscious.`,
    openGraph: {
      title: `${pageTitle} | Conscious Pulse`,
      description: `Resultados en vivo — ${title}`,
    },
  }
}

type VoteRow = { confidence: number | null; outcome_id: string; created_at: string }
type OutcomeRow = {
  id: string
  label: string
  probability: number
  sort_order: number | null
  translations?: unknown
}

export default async function PulseResultPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: market, error } = await supabase
    .from('prediction_markets')
    .select(
      `
      id,
      title,
      description,
      translations,
      status,
      current_probability,
      is_pulse,
      pulse_client_name,
      pulse_client_logo,
      market_outcomes ( id, label, probability, sort_order, translations ),
      market_votes ( confidence, outcome_id, created_at )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !market || !market.is_pulse) {
    notFound()
  }

  const locale = 'es'
  const question = getMarketText(
    {
      title: market.title,
      description: (market as { description?: string }).description,
      translations: market.translations as Parameters<typeof getMarketText>[0]['translations'],
    },
    'title',
    locale
  )

  const outcomes = (market.market_outcomes as OutcomeRow[] | null)?.slice() ?? []
  outcomes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const votes = (market.market_votes as VoteRow[] | null) ?? []
  const totalVotes = votes.length
  const avgConfidence =
    totalVotes > 0
      ? votes.reduce((sum, v) => sum + (typeof v.confidence === 'number' ? v.confidence : 0), 0) /
        totalVotes
      : 0

  const confDist = Array(10).fill(0) as number[]
  for (const v of votes) {
    const c = typeof v.confidence === 'number' ? v.confidence : 0
    if (c >= 1 && c <= 10) confDist[c - 1]++
  }
  const maxCount = Math.max(...confDist, 1)

  const clientName = market.pulse_client_name?.trim()
  const clientLogo = market.pulse_client_logo?.trim()

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="mb-10 border-b border-white/10 pb-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
              {clientLogo ? (
                <img
                  src={clientLogo}
                  alt={clientName || 'Client'}
                  className="h-12 max-w-[200px] object-contain object-left"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-lg font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                  P
                </div>
              )}
              <div className="text-center sm:text-left">
                {clientName && (
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">
                    {clientName}
                  </p>
                )}
                <p className="text-xs text-slate-500">Powered by Crowd Conscious</p>
              </div>
            </div>
            <Link
              href="/"
              className="text-sm text-slate-400 transition hover:text-emerald-400"
            >
              crowconscious.com →
            </Link>
          </div>
        </header>

        <article className="rounded-2xl border border-white/10 bg-[#1a2029] p-6 shadow-xl shadow-black/40 sm:p-8">
          <h1 className="text-balance text-2xl font-bold leading-tight text-white sm:text-3xl">
            {question}
          </h1>

          <div className="mt-8 space-y-5">
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

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Votos totales
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">{totalVotes}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Confianza promedio
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">
                {totalVotes > 0 ? avgConfidence.toFixed(1) : '—'}
                {totalVotes > 0 && <span className="text-lg text-slate-400">/10</span>}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-white">Distribución de confianza</h3>
            <div className="flex h-24 items-end gap-1">
              {confDist.map((count, i) => {
                const height = (count / maxCount) * 100
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-1 flex-col justify-end">
                      <div
                        className="w-full rounded-t bg-emerald-500/40 transition-all"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{i + 1}</span>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">Nivel de confianza (1–10)</p>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/predictions/markets/${market.id}`}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110"
            >
              Votar en Crowd Conscious
            </Link>
            <Link
              href="/pulse"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Más consultas Pulse
            </Link>
          </div>
        </article>

        <footer className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Parte de las predicciones impulsan el{' '}
            <Link href="/fund" className="text-emerald-400 underline-offset-2 hover:underline">
              Fondo Consciente
            </Link>{' '}
            para causas ambientales y sociales.
          </p>
        </footer>
      </div>
    </div>
  )
}
