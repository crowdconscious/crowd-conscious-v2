'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getMarketText } from '@/lib/i18n/market-translations'
import { getVotedGuestIdForMarket } from '@/lib/guest-vote-storage'
import ConfidenceHistogram from '@/components/pulse/ConfidenceHistogram'
import VoteTimeline from '@/components/pulse/VoteTimeline'
import PulseOutcomeBars from '@/components/pulse/PulseOutcomeBars'
import type { PulseOutcomeRow, PulseVoteRow } from '@/components/pulse/PulseResultClient'
import {
  computePulseEmbedExecutiveSummary,
  computePulseEmbedInsights,
} from '@/lib/pulse-embed-compute'
import type { PulseEmbedComponentKey } from '@/lib/pulse-embed-constants'

export type PulseEmbedData = {
  marketId: string
  title: string
  description: string | null
  translations: unknown
  status: string
  resolutionDate: string
  outcomes: PulseOutcomeRow[]
  votes: PulseVoteRow[]
}

type Props = {
  data: PulseEmbedData
  locale: 'es' | 'en'
  components: PulseEmbedComponentKey[]
  /** When true, render an H2 heading for the Pulse section (blog “full section” mode). */
  showOwnHeading: boolean
}

export default function PulseEmbed({ data, locale, components, showOwnHeading }: Props) {
  const { marketId, title, description, translations, status, resolutionDate } = data

  const outcomes = useMemo(() => {
    const o = [...data.outcomes]
    o.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    return o
  }, [data.outcomes])

  const votes = data.votes
  const totalVotes = votes.length
  const avgConfidence =
    totalVotes > 0
      ? votes.reduce((sum, v) => sum + (typeof v.confidence === 'number' ? v.confidence : 0), 0) /
        totalVotes
      : 0

  // Hide community % / charts / insights from blog readers who haven't voted
  // yet. We can only check guest vote status from the browser (no server
  // user context inside an embed), so authenticated voters whose browser
  // doesn't have the localStorage flag will also see the gated state — they
  // can click the CTA to land on the market detail and see results there.
  // Closed/resolved markets always reveal so historical embeds keep working.
  const isClosedOrResolved = status === 'resolved' || status === 'closed'
  const [hasVoted, setHasVoted] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setHasVoted(!!getVotedGuestIdForMarket(marketId))
  }, [marketId])
  const shouldRevealResults = isClosedOrResolved || hasVoted

  const question = getMarketText(
    {
      title,
      description: description ?? undefined,
      translations: translations as Parameters<typeof getMarketText>[0]['translations'],
    },
    'title',
    locale
  )

  const executiveSummary = useMemo(
    () => computePulseEmbedExecutiveSummary(outcomes, votes, locale),
    [outcomes, votes, locale]
  )

  const pulseInsights = useMemo(
    () => computePulseEmbedInsights(outcomes, votes, locale),
    [outcomes, votes, locale]
  )

  const closeDate = new Date(resolutionDate).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const show = (k: PulseEmbedComponentKey) => components.includes(k)

  return (
    <div className="mx-auto max-w-none">
      {showOwnHeading ? (
        <h2 className="mb-4 mt-10 text-2xl font-bold text-white">{locale === 'es' ? 'Datos del Pulse' : 'Pulse data'}</h2>
      ) : null}

      <div className="my-8 rounded-[12px] border border-[#2a3544] bg-[#1a2029] p-6 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-400/95">📊 Datos del Conscious Pulse</p>
            <h3 className="mt-1 text-lg font-bold leading-snug text-white sm:text-xl">{question}</h3>
            {description ? (
              <p className="mt-2 line-clamp-3 text-sm text-slate-400">
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
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-white/5 px-2 py-0.5 capitalize">{status}</span>
              <span>
                {locale === 'es' ? 'Cierra' : 'Closes'} {closeDate}
              </span>
            </div>
          </div>
        </div>

        {show('results_bars') && outcomes.length > 0 ? (
          <div className="mt-8">
            <PulseOutcomeBars
              outcomes={outcomes}
              locale={locale}
              revealResults={shouldRevealResults}
            />
          </div>
        ) : null}

        {!shouldRevealResults && outcomes.length > 0 && (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5 text-center">
            <p className="text-sm font-medium text-emerald-300">
              {locale === 'es'
                ? 'Vota para ver lo que opina la comunidad'
                : 'Vote to see what the community thinks'}
            </p>
            <Link
              href={`/predictions/markets/${marketId}#vote`}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110"
            >
              {locale === 'es' ? 'Dar mi opinión →' : 'Cast my vote →'}
            </Link>
          </div>
        )}

        {shouldRevealResults && show('executive_summary') && executiveSummary ? (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-[#1a2029] p-5">
            <h4 className="mb-2 text-sm font-semibold text-emerald-400">
              💡 {locale === 'es' ? 'Resumen ejecutivo' : 'Executive Summary'}
            </h4>
            <p className="text-sm leading-relaxed text-gray-300">
              {locale === 'es' ? executiveSummary.summaryEs : executiveSummary.summaryEn}
            </p>
          </div>
        ) : null}

        {shouldRevealResults && show('key_insights') && pulseInsights && totalVotes > 0 ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-[#1a2029] p-5">
            <h4 className="mb-3 text-sm font-semibold text-emerald-400">
              📊 {locale === 'es' ? 'Insights clave' : 'Key insights'}
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                •{' '}
                {locale === 'es'
                  ? `"${pulseInsights.leadingLabel}" lidera con ${pulseInsights.leadingPct}% y confianza ${pulseInsights.leadingConf.toFixed(1)}/10.`
                  : `"${pulseInsights.leadingLabel}" leads with ${pulseInsights.leadingPct}% and confidence ${pulseInsights.leadingConf.toFixed(1)}/10.`}
              </li>
              {pulseInsights.secondLabel != null && pulseInsights.secondConf != null && (
                <li>
                  •{' '}
                  {locale === 'es'
                    ? `Sin embargo, "${pulseInsights.secondLabel}" tiene ${
                        pulseInsights.secondConf > pulseInsights.leadingConf ? 'mayor' : 'menor'
                      } certeza (${pulseInsights.secondConf.toFixed(1)}/10) — ${
                        pulseInsights.secondConf > pulseInsights.leadingConf
                          ? 'sus defensores están más convencidos.'
                          : 'opinión menos firme.'
                      }`
                    : `However, "${pulseInsights.secondLabel}" has ${
                        pulseInsights.secondConf > pulseInsights.leadingConf ? 'higher' : 'lower'
                      } certainty (${pulseInsights.secondConf.toFixed(1)}/10) — ${
                        pulseInsights.secondConf > pulseInsights.leadingConf
                          ? 'its supporters are more convinced.'
                          : 'less firm opinion.'
                      }`}
                </li>
              )}
              <li>
                •{' '}
                {pulseInsights.strongOpinions > totalVotes * 0.6
                  ? locale === 'es'
                    ? `${pulseInsights.strongOpinions} de ${totalVotes} votantes (${Math.round((pulseInsights.strongOpinions / totalVotes) * 100)}%) tienen opiniones fuertes — hay consenso claro.`
                    : `${pulseInsights.strongOpinions} of ${totalVotes} voters (${Math.round((pulseInsights.strongOpinions / totalVotes) * 100)}%) have strong opinions — clear consensus.`
                  : locale === 'es'
                    ? `Solo ${pulseInsights.strongOpinions} de ${totalVotes} tienen opiniones fuertes — el tema aún está en debate.`
                    : `Only ${pulseInsights.strongOpinions} of ${totalVotes} have strong opinions — the topic is still debated.`}
              </li>
              {pulseInsights.lowestLabel != null &&
                pulseInsights.lowestConf != null &&
                pulseInsights.lowestLabel !== pulseInsights.leadingLabel && (
                  <li>
                    •{' '}
                    {locale === 'es'
                      ? `"${pulseInsights.lowestLabel}" tiene la certeza más baja (${pulseInsights.lowestConf.toFixed(1)}/10) — la gente vota por esta opción pero no está segura.`
                      : `"${pulseInsights.lowestLabel}" has the lowest certainty (${pulseInsights.lowestConf.toFixed(1)}/10) — people vote for it but aren't sure.`}
                  </li>
                )}
            </ul>
          </div>
        ) : null}

        {show('vote_metrics') ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {locale === 'es' ? 'Votos totales' : 'Total votes'}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">{totalVotes}</p>
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
        ) : null}

        {shouldRevealResults && (show('confidence_chart') || show('vote_timeline')) ? (
          <div className="mt-8 flex flex-col gap-6 animate-[fade-in_300ms_ease-out]">
            {show('confidence_chart') ? <ConfidenceHistogram votes={votes} locale={locale} /> : null}
            {show('vote_timeline') && totalVotes > 0 ? <VoteTimeline votes={votes} locale={locale} /> : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/pulse/${marketId}`}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110"
          >
            {locale === 'es' ? 'Votar en Crowd Conscious' : 'Vote on Crowd Conscious'}
          </Link>
        </div>

        <p className="mt-6 border-t border-white/5 pt-4 text-center text-[11px] font-medium tracking-wide text-slate-500">
          Powered by Conscious Pulse
        </p>
      </div>
    </div>
  )
}
