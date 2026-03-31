'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { getMarketText, getOutcomeLabel } from '@/lib/i18n/market-translations'
import { toDisplayPercentRounded } from '@/lib/probability-utils'
import { createClient } from '@/lib/supabase-client'
import ConfidenceHistogram from './ConfidenceHistogram'
import VoteTimeline from './VoteTimeline'
import OutcomeConfidenceTable from './OutcomeConfidenceTable'
import { exportPulseVotesCsv, type PulseCsvVote } from './pulse-export-csv'

export type PulseVoteRow = {
  id: string
  confidence: number | null
  outcome_id: string
  created_at: string
  user_id: string | null
  anonymous_participant_id: string | null
}

export type PulseOutcomeRow = {
  id: string
  label: string
  probability: number
  sort_order: number | null
  translations?: unknown
}

type Props = {
  marketId: string
  title: string
  description: string | null
  translations: unknown
  status: string
  resolutionDate: string
  pulseClientName: string | null
  pulseClientLogo: string | null
  sponsorName: string | null
  sponsorLogoUrl: string | null
  outcomes: PulseOutcomeRow[]
  votes: PulseVoteRow[]
  locale: 'es' | 'en'
  isEnhancedView: boolean
}

export default function PulseResultClient({
  marketId,
  title,
  description,
  translations,
  status,
  resolutionDate,
  pulseClientName,
  pulseClientLogo,
  sponsorName,
  sponsorLogoUrl,
  outcomes: initialOutcomes,
  votes: initialVotes,
  locale,
  isEnhancedView,
}: Props) {
  const [votes, setVotes] = useState<PulseVoteRow[]>(initialVotes)

  useEffect(() => {
    setVotes(initialVotes)
  }, [initialVotes])

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!isEnhancedView) return

    const channel = supabase
      .channel(`pulse-market-votes-${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_votes',
          filter: `market_id=eq.${marketId}`,
        },
        (payload) => {
          const row = payload.new as PulseVoteRow
          setVotes((prev) => {
            if (prev.some((v) => v.id === row.id)) return prev
            return [...prev, row].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isEnhancedView, marketId, supabase])

  const question = getMarketText(
    {
      title,
      description: description ?? undefined,
      translations: translations as Parameters<typeof getMarketText>[0]['translations'],
    },
    'title',
    locale
  )

  const outcomes = useMemo(() => {
    const o = [...initialOutcomes]
    o.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    return o
  }, [initialOutcomes])

  const totalVotes = votes.length
  const avgConfidence =
    totalVotes > 0
      ? votes.reduce((sum, v) => sum + (typeof v.confidence === 'number' ? v.confidence : 0), 0) /
        totalVotes
      : 0

  const strongCount = votes.filter(
    (v) => typeof v.confidence === 'number' && v.confidence >= 8
  ).length
  const weakCount = votes.filter(
    (v) => typeof v.confidence === 'number' && v.confidence <= 3
  ).length

  const outcomeLabelById = useCallback(
    (id: string) => {
      const o = outcomes.find((x) => x.id === id)
      return o ? getOutcomeLabel(o, locale) : id
    },
    [outcomes, locale]
  )

  const csvRows = useMemo((): PulseCsvVote[] => {
    return votes.map((v) => ({
      created_at: v.created_at,
      outcome_id: v.outcome_id,
      outcome_label: outcomeLabelById(v.outcome_id),
      confidence: typeof v.confidence === 'number' ? v.confidence : 0,
      kind: v.user_id ? 'registered' : 'anonymous',
    }))
  }, [votes, outcomeLabelById])

  const leadingOutcome = useMemo(() => {
    if (outcomes.length === 0) return null
    return [...outcomes].sort((a, b) => b.probability - a.probability)[0]
  }, [outcomes])

  const executiveSummary = useMemo(() => {
    if (!leadingOutcome || totalVotes === 0) return null
    const avgConfStr = avgConfidence.toFixed(1)
    const pct = Math.round(leadingOutcome.probability * 100)
    const shortLabel = getOutcomeLabel(leadingOutcome, locale).split(' / ')[0]
    const votesForLeading = votes.filter(
      (v) => v.outcome_id === leadingOutcome.id && typeof v.confidence === 'number'
    )
    const leadingConf =
      votesForLeading.length > 0
        ? (
            votesForLeading.reduce((s, v) => s + (v.confidence as number), 0) /
            votesForLeading.length
          ).toFixed(1)
        : '0.0'
    const strongPhraseEs =
      parseFloat(leadingConf) >= 7
        ? 'Esto indica una preferencia fuerte y clara de la comunidad.'
        : 'Sin embargo, el nivel de certeza sugiere que la opinión no es definitiva.'
    const strongPhraseEn =
      parseFloat(leadingConf) >= 7
        ? 'This indicates a strong, clear community preference.'
        : 'However, the certainty level suggests the opinion is not definitive.'
    const summaryEs = `Con ${totalVotes} participaciones y una confianza promedio de ${avgConfStr}/10, "${shortLabel}" lidera con ${pct}% de los votos y una certeza de ${leadingConf}/10. ${strongPhraseEs}`
    const summaryEn = `With ${totalVotes} participation${totalVotes !== 1 ? 's' : ''} and an average confidence of ${avgConfStr}/10, "${shortLabel}" leads with ${pct}% of the vote and an average certainty of ${leadingConf}/10. ${strongPhraseEn}`
    return { summaryEs, summaryEn }
  }, [avgConfidence, leadingOutcome, locale, totalVotes, votes])

  const handleExport = () => {
    exportPulseVotesCsv(csvRows, question)
  }

  const clientName = pulseClientName?.trim()
  const clientLogo = pulseClientLogo?.trim()
  const sponsor = sponsorName?.trim()
  const sponsorLogo = sponsorLogoUrl?.trim()

  const closeDate = new Date(resolutionDate).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const reportDate = new Date().toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <>
      <div className="pulse-report-print min-h-screen bg-[#0f1419] text-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <div className="pulse-print-only mb-8">
            <div className="flex items-center justify-between">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt="Crowd Conscious" className="h-8" />
              <span className="text-sm text-gray-400">
                {locale === 'es' ? 'Informe Conscious Pulse' : 'Conscious Pulse Report'} · {reportDate}
              </span>
            </div>
            <hr className="mt-4 border-gray-700" />
          </div>

          <header className="pulse-no-print mb-10 border-b border-white/10 pb-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                {clientLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={clientLogo}
                    alt={clientName || 'Client'}
                    className="h-12 max-w-[200px] object-contain object-left"
                  />
                ) : sponsorLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sponsorLogo}
                    alt={sponsor || ''}
                    className="h-12 max-w-[200px] object-contain object-left"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-lg font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                    P
                  </div>
                )}
                <div className="text-center sm:text-left">
                  {(clientName || sponsor) && (
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">
                      {clientName || sponsor}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">Powered by Crowd Conscious</p>
                </div>
              </div>
              <Link
                href="/"
                className="text-sm text-slate-400 transition hover:text-emerald-400"
              >
                crowdconscious.app →
              </Link>
            </div>
          </header>

          <article className="rounded-2xl border border-white/10 bg-[#1a2029] p-6 shadow-xl shadow-black/40 sm:p-8">
            <h1 className="text-balance text-2xl font-bold leading-tight text-white sm:text-3xl">
              {question}
            </h1>
            {description ? (
              <p className="mt-3 text-sm text-slate-400 line-clamp-4">
                {getMarketText(
                  {
                    title,
                    description,
                    translations: translations as Parameters<typeof getMarketText>[0]['translations'],
                  },
                  'description',
                  locale
                )}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-white/5 px-2 py-0.5 capitalize">{status}</span>
              <span>
                {locale === 'es' ? 'Cierra' : 'Closes'} {closeDate}
              </span>
            </div>

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

            {executiveSummary ? (
              <div className="mt-6 rounded-xl border border-emerald-500/20 bg-[#1a2029] p-5">
                <h3 className="mb-2 text-sm font-semibold text-emerald-400">
                  {'💡 '}
                  {locale === 'es' ? 'Resumen ejecutivo' : 'Executive Summary'}
                </h3>
                <p className="text-sm leading-relaxed text-gray-300">
                  {locale === 'es' ? executiveSummary.summaryEs : executiveSummary.summaryEn}
                </p>
              </div>
            ) : null}

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {locale === 'es' ? 'Votos totales' : 'Total votes'}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                  {totalVotes}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {locale === 'es' ? 'Confianza promedio' : 'Average confidence'}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">
                  {totalVotes > 0 ? avgConfidence.toFixed(1) : '—'}
                  {totalVotes > 0 && <span className="text-lg text-slate-400">/10</span>}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <ConfidenceHistogram votes={votes} />
              {totalVotes > 0 ? <VoteTimeline votes={votes} /> : null}
            </div>

            {isEnhancedView && (
              <div className="mt-8 space-y-6">
                <OutcomeConfidenceTable
                  outcomes={outcomes.map((o) => ({ id: o.id, label: getOutcomeLabel(o, locale) }))}
                  votes={votes}
                  locale={locale}
                />
                <div className="pulse-no-print flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20"
                  >
                    📥 {locale === 'es' ? 'Exportar CSV' : 'Export CSV'}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    📄 {locale === 'es' ? 'Imprimir reporte' : 'Print report'}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {locale === 'es' ? 'Vista analítica en tiempo real' : 'Live analytics view'} ·{' '}
                  {locale === 'es' ? 'Opiniones fuertes' : 'Strong opinions'} (≥8): {strongCount} ·{' '}
                  {locale === 'es' ? 'Débiles' : 'Weak'} (≤3): {weakCount}
                </p>
              </div>
            )}

            <div className="pulse-no-print mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/predictions/markets/${marketId}`}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110"
              >
                {locale === 'es' ? 'Votar en Crowd Conscious' : 'Vote on Crowd Conscious'}
              </Link>
              <Link
                href="/pulse"
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                {locale === 'es' ? 'Más consultas Pulse' : 'More Pulse surveys'}
              </Link>
            </div>

            <div className="mt-8 border-t border-gray-700 pt-4">
              <p className="text-xs text-gray-500">
                {locale === 'es'
                  ? 'Este Pulse contribuye al Fondo Consciente para causas comunitarias elegidas democráticamente.'
                  : 'This Pulse contributes to the Conscious Fund for democratically chosen community causes.'}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                crowdconscious.app · Conscious Pulse · {reportDate}
              </p>
            </div>
          </article>

          <footer className="pulse-print-hide-footer mt-12 text-center">
            <p className="text-sm text-slate-500">
              {locale === 'es' ? 'Parte de las predicciones impulsan el' : 'Part of predictions fund the'}{' '}
              <Link href="/fund" className="text-emerald-400 underline-offset-2 hover:underline">
                {locale === 'es' ? 'Fondo Consciente' : 'Conscious Fund'}
              </Link>{' '}
              {locale === 'es'
                ? 'para causas ambientales y sociales.'
                : 'for environmental and social causes.'}
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}
