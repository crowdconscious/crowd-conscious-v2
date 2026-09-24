'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { getMarketText, getOutcomeLabel } from '@/lib/i18n/market-translations'
import { createClient } from '@/lib/supabase-client'
import { getVotedGuestIdForMarket } from '@/lib/guest-vote-storage'
import ConfidenceHistogram from './ConfidenceHistogram'
import VoteTimeline from './VoteTimeline'
import VoteTimingSummary from './VoteTimingSummary'
import PulseOutcomeBars from './PulseOutcomeBars'
import PulseResultsCard from './PulseResultsCard'
import OutcomeConfidenceTable from './OutcomeConfidenceTable'
import PulseSimRevealModule, { type PulseSimReveal } from './PulseSimRevealModule'
import PulseSimTeaser from './PulseSimTeaser'
import PulseInlineVote from './PulseInlineVote'
import { exportPulseVotesCsv, type PulseCsvVote } from './pulse-export-csv'
import { parseRankings } from '@/lib/pulse-vote-ranking'
import {
  formatParticipationCount,
  shouldRevealCount,
} from '@/lib/display/participation'
import { lowNRevealCopy } from '@/lib/post-vote-reveal'
import ShareButton from '@/components/ShareButton'
import {
  aggregatePulseVotes,
  histogramConfidenceSum,
  histogramCountAtLeast,
  histogramCountAtMost,
  histogramValidCount,
  resolveOutcomeAvgConfidence,
  type PulseVoteAggregates,
} from '@/lib/pulse-vote-aggregates'
import type { Database } from '@/types/database'

export type PulseVoteRow = {
  id: string
  confidence: number | null
  outcome_id: string
  created_at: string
  user_id: string | null
  anonymous_participant_id: string | null
  reasoning?: string | null
  rankings?: unknown
  other_text?: string | null
  /** Multi picks; also present for single/ranked after mig 262 backfill. */
  selections?: { outcome_id: string; confidence: number }[] | null
}

/** The only per-vote data a public viewer receives: their own vote. */
export type PulseViewerVote = {
  outcomeId: string
  confidence: number | null
  selections?: { outcome_id: string; confidence: number }[] | null
}

export type PulseFeaturedReasoning = {
  id: string
  reasoning: string
  confidence: number
  outcome_id: string
  author_name: string
}

export type PulseOutcomeRow = {
  id: string
  label: string
  /** Optional one-line detail (migration 214). Spanish lives here; non-ES locales in `translations`. */
  subtitle?: string | null
  probability: number
  sort_order: number | null
  translations?: unknown
  is_other?: boolean | null
  vote_count?: number | null
  total_confidence?: number | null
  /** Picks with confidence >= 1. Migration 262. */
  confident_pick_count?: number | null
  is_winner?: boolean | null
}

type Props = {
  marketId: string
  title: string
  description: string | null
  /** Migration 215. 2-sentence blurb rendered above the vote/outcome bars. */
  descriptionShort?: string | null
  translations: unknown
  status: string
  resolutionDate: string
  /** Market created_at / published_at — Pulse duration context for analytics. */
  openedAt?: string | null
  pulseClientName: string | null
  pulseClientLogo: string | null
  sponsorName: string | null
  sponsorLogoUrl: string | null
  outcomes: PulseOutcomeRow[]
  voteMode?: 'single' | 'ranked' | 'multi'
  /** For vote_mode=multi (2–5). */
  maxSelections?: number
  allowOther?: boolean
  /**
   * Server-side vote aggregation. The public payload deliberately carries no
   * per-vote rows (no voter user_ids, bounded size) — see
   * lib/pulse-vote-aggregates.ts.
   */
  aggregates: PulseVoteAggregates
  /** The current viewer's own vote, when authed and they voted. */
  viewerVote?: PulseViewerVote | null
  /**
   * Full vote rows for authorized analytics viewers (admin / sponsor token)
   * only — powers CSV export and the realtime live view. Never passed for
   * public viewers.
   */
  enhancedVotes?: PulseVoteRow[]
  locale: 'es' | 'en'
  isEnhancedView: boolean
  featuredReasonings?: PulseFeaturedReasoning[]
  /**
   * Pulse Simulation reveal payload (§5.7). The loader attaches this:
   *  - Public: ONLY when SIM_REVEAL_ENABLED + revealed run + Pulse closed.
   *  - Admin: live preview even while the Pulse is open (adminPreview flag).
   * Null/absent otherwise. Non-admins never receive sim aggregates on an open Pulse.
   */
  simReveal?: PulseSimReveal | null
  /**
   * Content-free pre-vote teaser flag (§5.7). True only when the flag is on, a
   * revealed run exists, the viewer has not voted, and the Pulse is still open.
   * No sim numbers ever ride along with it.
   */
  simTeaser?: boolean
  /** Full market row for inline VotePanel on shared links (Phase 1). */
  voteMarket?: Database['public']['Tables']['prediction_markets']['Row'] | null
  isAuthenticated?: boolean
}

export default function PulseResultClient({
  marketId,
  title,
  description,
  descriptionShort = null,
  translations,
  status,
  resolutionDate,
  openedAt = null,
  pulseClientName,
  pulseClientLogo,
  sponsorName,
  sponsorLogoUrl,
  outcomes: initialOutcomes,
  voteMode = 'single',
  maxSelections = 3,
  allowOther = false,
  aggregates: serverAggregates,
  viewerVote = null,
  enhancedVotes,
  locale,
  isEnhancedView,
  featuredReasonings = [],
  simReveal = null,
  simTeaser = false,
  voteMarket = null,
  isAuthenticated = false,
}: Props) {
  // Full rows exist only in the enhanced (admin/sponsor) view, where they
  // feed CSV export and grow via the realtime subscription below.
  const [votes, setVotes] = useState<PulseVoteRow[]>(enhancedVotes ?? [])
  // Guest vote detection runs only on the client (localStorage). Default to
  // false on first render so the SSR HTML matches "not voted" and we then
  // upgrade to "voted" inside useEffect for guests who have a local record.
  const [guestHasVoted, setGuestHasVoted] = useState(false)

  useEffect(() => {
    setVotes(enhancedVotes ?? [])
  }, [enhancedVotes])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setGuestHasVoted(!!getVotedGuestIdForMarket(marketId))
  }, [marketId])

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

  // Resolve the short blurb honouring the same translations.[locale] override
  // that title/description use. Empty string when neither column nor override
  // is set; the JSX guards against rendering an empty <p>.
  const shortBlurb = getMarketText(
    {
      title,
      description: description ?? undefined,
      description_short: descriptionShort ?? undefined,
      translations: translations as Parameters<typeof getMarketText>[0]['translations'],
    },
    'description_short',
    locale
  ).trim()

  const outcomes = useMemo(() => {
    const o = [...initialOutcomes]
    o.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    return o
  }, [initialOutcomes])

  // Enhanced views recompute aggregates from the live vote rows so the
  // realtime subscription keeps charts current; public views render the
  // server-computed aggregates as-is.
  const aggregates = useMemo(
    () => (isEnhancedView ? aggregatePulseVotes(votes) : serverAggregates),
    [isEnhancedView, votes, serverAggregates]
  )

  const totalVotes = aggregates.totalVotes
  const statedConfN = histogramValidCount(aggregates.confidenceHistogram)
  const avgConfidence =
    statedConfN > 0
      ? histogramConfidenceSum(aggregates.confidenceHistogram) / statedConfN
      : 0

  // Reveal the community signal (per-option %, charts, insights, reasonings)
  // only to people who have already cast their vote, OR who are authorized
  // analytics viewers (admin / sponsor token), OR when the market is
  // resolved/closed (no more bias to introduce).
  // A Pulse is closed once its status flips OR its advertised end date passes,
  // even before the auto-resolve cron flips status to 'resolved'. Treat both the
  // same way: reveal results, stop inviting votes.
  const isPastCloseDate = useMemo(() => {
    const t = new Date(resolutionDate).getTime()
    return Number.isFinite(t) && t <= Date.now()
  }, [resolutionDate])
  const isClosedOrResolved = status === 'resolved' || status === 'closed' || isPastCloseDate
  const authedHasVoted = !!viewerVote
  const hasVoted = authedHasVoted || guestHasVoted
  const shouldRevealResults = isEnhancedView || isClosedOrResolved || hasVoted
  // Density honesty: below PARTICIPATION_REVEAL_THRESHOLD never show raw
  // counts, option %, or majority copy — first-voices / "Votación abierta".
  const densityRevealed = shouldRevealCount(totalVotes)
  const showFullCommunityResults = shouldRevealResults && densityRevealed
  const showLowNPostVote = shouldRevealResults && !densityRevealed && !isEnhancedView
  const lowNCopy = lowNRevealCopy(locale)

  const strongCount = histogramCountAtLeast(aggregates.confidenceHistogram, 8)
  const weakCount = histogramCountAtMost(aggregates.confidenceHistogram, 3)

  const outcomeLabelById = useCallback(
    (id: string) => {
      const o = outcomes.find((x) => x.id === id)
      return o ? getOutcomeLabel(o, locale) : id
    },
    [outcomes, locale]
  )

  const csvRows = useMemo((): PulseCsvVote[] => {
    return votes.map((v) => {
      const ranks = parseRankings(v.rankings)
      const rank2 = ranks?.find((r) => r.rank === 2)?.outcome_id
      const rank3 = ranks?.find((r) => r.rank === 3)?.outcome_id
      const sels = v.selections
      const selectionsStr =
        Array.isArray(sels) && sels.length > 0
          ? sels
              .map((s) => `${outcomeLabelById(s.outcome_id)}:${s.confidence}`)
              .join('; ')
          : ''
      return {
        created_at: v.created_at,
        outcome_id: v.outcome_id,
        outcome_label: outcomeLabelById(v.outcome_id),
        confidence: typeof v.confidence === 'number' ? v.confidence : 0,
        kind: v.user_id ? 'registered' : 'anonymous',
        reasoning: v.reasoning ?? null,
        rank2_label: rank2 ? outcomeLabelById(rank2) : '',
        rank3_label: rank3 ? outcomeLabelById(rank3) : '',
        other_text: v.other_text ?? '',
        selections: selectionsStr,
      }
    })
  }, [votes, outcomeLabelById])

  const leadingOutcome = useMemo(() => {
    if (outcomes.length === 0) return null
    return [...outcomes].sort((a, b) => b.probability - a.probability)[0]
  }, [outcomes])

  const pulseInsights = useMemo(() => {
    if (totalVotes === 0 || outcomes.length === 0) return null
    const sorted = [...outcomes].sort((a, b) => b.probability - a.probability)
    const lead = sorted[0]
    const second = sorted[1]
    const leadingPct = Math.round(lead.probability * 100)
    const avgForOutcome = (oid: string) => {
      const o = outcomes.find((x) => x.id === oid)
      return resolveOutcomeAvgConfidence({
        totalConfidence: o?.total_confidence,
        confidentPickCount: o?.confident_pick_count,
        stats: aggregates.byOutcome[oid],
      })
    }
    const leadingConf = avgForOutcome(lead.id)
    const secondConf = second ? avgForOutcome(second.id) : null
    const leadingLabel = getOutcomeLabel(lead, locale).split(' / ')[0]
    const secondLabel = second ? getOutcomeLabel(second, locale).split(' / ')[0] : null
    const strongOpinions = histogramCountAtLeast(aggregates.confidenceHistogram, 8)
    let lowest: { label: string; conf: number } | null = null
    for (const o of outcomes) {
      const a = avgForOutcome(o.id)
      if (a == null) continue
      if (!lowest || a < lowest.conf) {
        lowest = { label: getOutcomeLabel(o, locale).split(' / ')[0], conf: a }
      }
    }
    return {
      leadingLabel,
      leadingPct,
      leadingConf: leadingConf ?? 0,
      secondLabel,
      secondConf,
      strongOpinions,
      lowestLabel: lowest?.label ?? null,
      lowestConf: lowest?.conf ?? null,
    }
  }, [outcomes, aggregates, locale, totalVotes])

  const executiveSummary = useMemo(() => {
    if (!leadingOutcome || totalVotes === 0) return null
    const avgConfStr = avgConfidence.toFixed(1)
    const pct = Math.round(leadingOutcome.probability * 100)
    const shortLabel = getOutcomeLabel(leadingOutcome, locale).split(' / ')[0]
    const leadingConf = (
      resolveOutcomeAvgConfidence({
        totalConfidence: leadingOutcome.total_confidence,
        confidentPickCount: leadingOutcome.confident_pick_count,
        stats: aggregates.byOutcome[leadingOutcome.id],
      }) ?? 0
    ).toFixed(1)
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
  }, [avgConfidence, leadingOutcome, locale, totalVotes, aggregates])

  const handleExport = () => {
    exportPulseVotesCsv(csvRows, question)
  }

  const panelMyVote = viewerVote
    ? {
        outcome_id: viewerVote.outcomeId,
        outcome_label:
          outcomes.find((o) => o.id === viewerVote.outcomeId)?.label ?? '',
        confidence: viewerVote.confidence ?? 0,
        xp_earned: 0,
        is_correct: null as boolean | null,
        bonus_xp: 0,
        selections: viewerVote.selections ?? null,
      }
    : null

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
      <div className="pulse-report-print min-h-screen bg-[#0f1419] text-slate-100 print:min-h-0">
        <div className="pulse-report-container mx-auto max-w-3xl px-4 py-10 sm:py-14 print:py-6">
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

          {/* Phase 0 shared-link rule: object + verb first; sponsor/fund below. */}
          <article className="rounded-2xl border border-white/10 bg-[#1a2029] p-6 shadow-xl shadow-black/40 sm:p-8 print:shadow-none">
            <h1 className="text-balance text-2xl font-bold leading-tight text-white sm:text-3xl">
              {question}
            </h1>
            {shortBlurb ? (
              <p className="mt-3 mb-1 max-w-2xl text-base md:text-lg leading-relaxed text-gray-300">
                {shortBlurb}
              </p>
            ) : null}
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

            {/* Primary verb — keep mounted while open so PostVoteScreen can
                open on guest/registered success even after hasVoted flips.
                Unmounting on shouldRevealResults was wiping the Phase 1 reveal. */}
            {voteMarket && !isClosedOrResolved ? (
              <PulseInlineVote
                market={voteMarket}
                outcomes={outcomes.map((o) => ({
                  id: o.id,
                  label: o.label,
                  subtitle: o.subtitle ?? null,
                  probability: o.probability,
                  vote_count: o.vote_count ?? 0,
                  total_confidence: o.total_confidence ?? 0,
                  confident_pick_count: o.confident_pick_count ?? 0,
                  is_winner: o.is_winner ?? null,
                  translations: o.translations as
                    | Record<string, { label?: string; subtitle?: string }>
                    | null
                    | undefined,
                  is_other: o.is_other ?? null,
                  sort_order: o.sort_order,
                }))}
                locale={locale}
                isAuthenticated={isAuthenticated}
                myVote={panelMyVote}
                aggregates={aggregates}
                featuredReasonings={featuredReasonings}
                onVoted={() => {
                  if (!isAuthenticated) setGuestHasVoted(true)
                }}
              />
            ) : !shouldRevealResults ? (
              <div className="pulse-section mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5 text-center">
                <p className="text-sm font-medium text-emerald-300">
                  {locale === 'es'
                    ? 'Vota para ver lo que opina la comunidad'
                    : 'Vote to see what the community thinks'}
                </p>
                <Link
                  href={`/predictions/markets/${marketId}#vote`}
                  className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110 sm:w-auto"
                >
                  {locale === 'es' ? 'Votar' : 'Vote'}
                </Link>
              </div>
            ) : null}

            <div className="pulse-section mt-8">
              {showFullCommunityResults ? (
                <>
                <PulseResultsCard
                  outcomes={outcomes}
                  totalVotes={totalVotes}
                  avgConfidence={totalVotes > 0 ? avgConfidence : null}
                  locale={locale}
                  voteMode={voteMode}
                  byOutcome={aggregates.byOutcome}
                  className="animate-[fade-in_300ms_ease-out]"
                />
                {voteMode === 'ranked' &&
                Object.values(aggregates.preferenceByOutcome ?? {}).some(
                  (p) => p.rank2Count + p.rank3Count > 0
                ) ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {locale === 'es'
                        ? 'También eligieron como 2.ª o 3.ª'
                        : 'Also ranked 2nd or 3rd'}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {locale === 'es'
                        ? 'Señal de preferencia. No suma al peso de confianza de los resultados de arriba.'
                        : 'Preference signal. Does not add confidence weight to the results above.'}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {outcomes.map((o) => {
                        const pref = aggregates.preferenceByOutcome?.[o.id]
                        const n = (pref?.rank2Count ?? 0) + (pref?.rank3Count ?? 0)
                        if (n === 0) return null
                        return (
                          <li
                            key={o.id}
                            className="flex justify-between gap-3 text-sm text-slate-300"
                          >
                            <span className="min-w-0 truncate">
                              {getOutcomeLabel(o, locale)}
                            </span>
                            <span className="shrink-0 tabular-nums text-slate-500">
                              {shouldRevealCount(n)
                                ? locale === 'es'
                                  ? `${n} mención${n === 1 ? '' : 'es'}`
                                  : `${n} mention${n === 1 ? '' : 's'}`
                                : locale === 'es'
                                  ? 'Menciones'
                                  : 'Mentions'}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
                {(allowOther || (aggregates.otherTextGroups?.length ?? 0) > 0) &&
                (aggregates.otherTextGroups?.length ?? 0) > 0 ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {locale === 'es' ? 'Respuestas en Otro' : 'Other answers'}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {locale === 'es'
                        ? 'Textos únicos. El peso de confianza de "Otro" está en la barra de arriba.'
                        : 'Unique texts. The confidence weight for Other is in the bar above.'}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {aggregates.otherTextGroups.map((g) => {
                        const showCount = shouldRevealCount(g.count)
                        return (
                          <li
                            key={g.text}
                            className="flex justify-between gap-3 text-sm text-slate-300"
                          >
                            <span className="min-w-0 break-words">{g.text}</span>
                            {showCount ? (
                              <span className="shrink-0 tabular-nums text-slate-500">
                                {g.count}
                              </span>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
                </>
              ) : showLowNPostVote ? (
                <div className="rounded-2xl border border-white/10 bg-cc-card p-5 sm:p-6 animate-[fade-in_300ms_ease-out]">
                  <h3 className="text-lg font-semibold text-white">
                    {lowNCopy.headline}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300 leading-snug">
                    {lowNCopy.body}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    {formatParticipationCount(totalVotes, locale)}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <ShareButton
                      marketId={marketId}
                      title={question}
                      sponsorName={sponsorName ?? undefined}
                    />
                  </div>
                </div>
              ) : (
                // Pre-vote: keep the label/subtitle list (no %, no bar) so the
                // user can read every option before they vote. Replaces the
                // older `PulseOutcomeBars` revealResults={false} rendering.
                <PulseOutcomeBars
                  outcomes={outcomes}
                  locale={locale}
                  revealResults={false}
                />
              )}
            </div>

            {/* Sponsor / client chrome — below the verb (Phase 0 shared-link rule). */}
            {(clientName || sponsor || clientLogo || sponsorLogo) && (
              <div className="pulse-no-print mt-8 border-t border-white/10 pt-6">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {clientLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={clientLogo}
                        alt={clientName || 'Client'}
                        className="h-10 max-w-[160px] object-contain object-left"
                      />
                    ) : sponsorLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sponsorLogo}
                        alt={sponsor || ''}
                        className="h-10 max-w-[160px] object-contain object-left"
                      />
                    ) : null}
                    <div>
                      {(clientName || sponsor) && (
                        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">
                          {clientName || sponsor}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        {locale === 'es'
                          ? 'Consulta impulsada con Crowd Conscious'
                          : 'Survey powered by Crowd Conscious'}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/"
                    className="text-sm text-slate-400 transition hover:text-emerald-400"
                  >
                    crowdconscious.app →
                  </Link>
                </div>
              </div>
            )}

            {/* Pre-vote simulation teaser (§5.7): content-free amber module — the
                only sim-related surface a user may see before voting on an open
                Pulse. The `!shouldRevealResults` guard also covers the local
                guest-vote case (a guest who voted sees results, not the teaser). */}
            {simTeaser && !shouldRevealResults ? (
              <PulseSimTeaser marketId={marketId} locale={locale} />
            ) : null}

            {showFullCommunityResults && executiveSummary ? (
              <div className="pulse-section mt-6 rounded-xl border border-emerald-500/20 bg-[#1a2029] p-5">
                <h3 className="mb-2 text-sm font-semibold text-emerald-400">
                  {'💡 '}
                  {locale === 'es' ? 'Resumen ejecutivo' : 'Executive Summary'}
                </h3>
                <p className="text-sm leading-relaxed text-gray-300">
                  {locale === 'es' ? executiveSummary.summaryEs : executiveSummary.summaryEn}
                </p>
              </div>
            ) : null}

            {showFullCommunityResults && pulseInsights ? (
              <div className="pulse-section mt-6 rounded-xl border border-white/10 bg-[#1a2029] p-5">
                <h3 className="mb-3 text-sm font-semibold text-emerald-400">
                  {'📊 '}
                  {locale === 'es' ? 'Insights clave' : 'Key insights'}
                </h3>
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

            {/* Pre-vote participation — density-honest label, never a raw
                thin count or average confidence next to a vote CTA. */}
            {!shouldRevealResults && (
              <div className="pulse-section mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {locale === 'es' ? 'Participación' : 'Participation'}
                  </p>
                  <p
                    className={`mt-1 font-bold text-white ${
                      densityRevealed ? 'text-2xl tabular-nums' : 'text-lg'
                    }`}
                  >
                    {formatParticipationCount(totalVotes, locale)}
                  </p>
                </div>
                {densityRevealed ? (
                  <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {locale === 'es' ? 'Confianza promedio' : 'Average confidence'}
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">
                      {avgConfidence.toFixed(1)}
                      <span className="text-lg text-slate-400">/10</span>
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {locale === 'es' ? 'Estado' : 'Status'}
                    </p>
                    <p className="mt-1 text-lg font-bold text-emerald-400">
                      {locale === 'es' ? 'Sé de los primeros' : 'Be among the first'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {showFullCommunityResults && (
              <div className="mt-8 space-y-6 animate-[fade-in_300ms_ease-out]">
                <ConfidenceHistogram
                  histogram={aggregates.confidenceHistogram}
                  locale={locale}
                />
                {totalVotes > 0 ? (
                  <VoteTimeline timeline={aggregates.timeline} locale={locale} />
                ) : null}
              </div>
            )}

            {isEnhancedView && (
              <div className="mt-8 space-y-6">
                {votes.length > 0 ? (
                  <VoteTimingSummary
                    votes={votes}
                    locale={locale}
                    openAt={openedAt}
                    closeAt={resolutionDate}
                  />
                ) : null}
                <div className="pulse-section">
                  <OutcomeConfidenceTable
                    outcomes={outcomes.map((o) => ({ id: o.id, label: getOutcomeLabel(o, locale) }))}
                    statsByOutcome={aggregates.byOutcome}
                    locale={locale}
                  />
                </div>
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

            {showFullCommunityResults && featuredReasonings.length > 0 ? (
              <div className="pulse-section pulse-featured-reasonings mt-6 rounded-xl border border-white/10 bg-[#1a2029] p-5">
                <h3 className="mb-4 text-sm font-bold text-white">
                  💬{' '}
                  {locale === 'es'
                    ? `Razonamientos destacados (${featuredReasonings.length} de ${totalVotes} votantes compartieron)`
                    : `Featured reasoning (${featuredReasonings.length} of ${totalVotes} voters shared)`}
                </h3>
                {outcomes.map((o) => {
                  const quotes = featuredReasonings
                    .filter((r) => r.outcome_id === o.id)
                    .sort((a, b) => b.confidence - a.confidence)
                    .slice(0, 5)
                  if (quotes.length === 0) return null
                  const label = getOutcomeLabel(o, locale).split(' / ')[0]
                  return (
                    <div key={o.id} className="pulse-outcome-reason-group mb-4">
                      <h4 className="mb-2 text-xs font-bold text-emerald-400">
                        {label}
                        {' · '}
                        {quotes.length} {locale === 'es' ? 'razones' : 'reasons'}
                      </h4>
                      {quotes.map((r) => (
                        <div
                          key={r.id}
                          className="reasoning-item pulse-reasoning-quote mb-2 border-l-2 border-emerald-500/30 py-1.5 pl-3"
                        >
                          <p className="text-sm text-gray-300">&ldquo;{r.reasoning}&rdquo;</p>
                          <span className="text-xs text-gray-600">
                            — {r.author_name} · {locale === 'es' ? 'certeza' : 'confidence'} {r.confidence}/10
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ) : null}

            {/* "IA vs. Realidad" reveal module (§5.7). Public: only after close
                + revealed run. Admin: live preview payload even while open. */}
            {showFullCommunityResults && simReveal ? (
              <PulseSimRevealModule locale={locale} reveal={simReveal} />
            ) : null}

            <div className="pulse-no-print mt-10 flex flex-col gap-3 sm:flex-row">
              {/* Deep-link kept only when inline vote is unavailable (closed /
                  already revealed). Shared links use PulseInlineVote above. */}
              {!isClosedOrResolved && shouldRevealResults ? null : !isClosedOrResolved && !voteMarket ? (
                <Link
                  href={`/predictions/markets/${marketId}#vote`}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110"
                >
                  {locale === 'es' ? 'Votar' : 'Vote'}
                </Link>
              ) : null}
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
              {locale === 'es' ? 'Parte de los votos impulsa el' : 'Part of votes fund the'}{' '}
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
