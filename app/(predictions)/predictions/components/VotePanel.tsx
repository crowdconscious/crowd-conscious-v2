'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import type { Database } from '@/types/database'
import { hasGuestVotedMarket } from '@/lib/guest-vote-storage'
import { toDisplayPercent } from '@/lib/probability-utils'
import {
  getMarketText,
  getOutcomeCardLabel,
  getOutcomeLabel,
  type MarketWithTranslations,
} from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'
import {
  getPickMessageNonPulse,
  isPulseLikeMarket,
  voteActionCopy,
} from '@/lib/i18n/pulse-market-copy'
import ShareButton from '@/components/ShareButton'
import {
  normalizeVoteReasoning,
  voteReasoningMaxForMarket,
} from '@/lib/vote-reasoning'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row'] & {
  market_type?: string
  total_votes?: number
  resolution?: string
}

type Outcome = {
  id: string
  label: string
  probability: number
  vote_count: number
  total_confidence: number
  is_winner: boolean | null
  translations?: Record<string, { label?: string }> | null
}

type MyVote = {
  outcome_id: string
  outcome_label: string
  confidence: number
  xp_earned: number
  is_correct: boolean | null
  bonus_xp: number
}

export type RelatedMarketBrief = {
  id: string
  title: string
  translations?: { en?: { title?: string } } | null
  total_votes: number | null
  is_pulse: boolean
  category: string
}

const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Wild guess',
  2: 'Just a hunch',
  3: 'Just a hunch',
  4: 'I think so',
  5: 'I think so',
  6: 'Pretty sure',
  7: 'Pretty sure',
  8: 'Very confident',
  9: 'Very confident',
  10: 'Absolutely certain',
}

const CONFIDENCE_EMOJI: Record<number, string> = {
  1: '🤔',
  2: '🤔',
  3: '🤔',
  4: '🤷',
  5: '🤷',
  6: '😏',
  7: '😏',
  8: '😎',
  9: '😎',
  10: '🔥',
}

function getConfidenceLabel(n: number): string {
  return CONFIDENCE_LABELS[Math.min(10, Math.max(1, n))] || 'I think so'
}

function getConfidenceEmoji(n: number): string {
  return CONFIDENCE_EMOJI[Math.min(10, Math.max(1, n))] || '🤷'
}

/** Auto-confidence for multi-outcome: picking favorite = lower, underdog = higher */
function autoConfidence(selectedOutcomeProbability: number): number {
  if (selectedOutcomeProbability > 0.7) return 5
  if (selectedOutcomeProbability > 0.4) return 7
  if (selectedOutcomeProbability > 0.2) return 8
  return 9
}

/** Normalize probability to 0-1 for logic (DB may store 0-1 or 0-100) */
function toDecimal(prob: number): number {
  const n = Number(prob)
  if (Number.isNaN(n)) return 0
  return n > 1 ? n / 100 : Math.min(1, Math.max(0, n))
}

/** Binary always has a slider; multi-outcome only for Pulse / live / micro (not plain “bold pick” multis) */
function needsUserConfidenceSlider(isBinary: boolean, m: PredictionMarket): boolean {
  return (
    isBinary ||
    isPulseLikeMarket(m) ||
    m.is_micro_market === true ||
    m.live_event_id != null
  )
}

/** Bilingual hint: other language in parentheses when label uses " / " */
function bilingualHint(outcome: Outcome, locale: string): string | null {
  if (!outcome.label.includes(' / ')) return null
  const parts = outcome.label.split(' / ').map((s) => s.trim())
  if (parts.length < 2) return null
  return locale === 'es' || locale.startsWith('es') ? parts[1] : parts[0]
}

function submitPrimaryLabel(
  isPulse: boolean,
  locale: string,
  isEditing: boolean,
  copy: ReturnType<typeof voteActionCopy>
): string {
  if (isEditing) return copy.updateVerb
  if (isPulse) return locale === 'es' ? 'Enviar opinión' : 'Submit opinion'
  return locale === 'es' ? 'Enviar predicción' : 'Submit prediction'
}

export type GuestVotePayload = {
  outcomeId: string
  confidence: number
  voteYesNo: 'yes' | 'no' | null
}

interface VotePanelProps {
  market: PredictionMarket
  outcomes: Outcome[]
  myVote: MyVote | null
  onVoteSuccess?: (payload: {
    xpEarned?: number
    isUpdate?: boolean
    noChange?: boolean
  }) => void
  isAuthenticated?: boolean
  guestId?: string | null
  guestVoteRecord?: GuestVotePayload | null
  onAnonymousVoteSuccess?: (
    payload: GuestVotePayload,
    meta: { total_votes?: number; engagement_count?: number }
  ) => void
  relatedMarkets?: RelatedMarketBrief[]
}

export function VotePanel({
  market,
  outcomes,
  myVote,
  onVoteSuccess,
  isAuthenticated = true,
  guestId = null,
  guestVoteRecord = null,
  onAnonymousVoteSuccess,
  relatedMarkets = [],
}: VotePanelProps) {
  const locale = useLocale()
  const loc = locale === 'en' ? 'en' : 'es'
  const isPulse = isPulseLikeMarket(market)
  const copy = voteActionCopy(loc, isPulse)
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(7)
  const [reasoning, setReasoning] = useState('')
  const [loading, setLoading] = useState(false)

  const reasoningMax = voteReasoningMaxForMarket(market.is_micro_market)

  const isResolved = market.status === 'resolved'
  const isEditing = isAuthenticated && !!myVote
  const guestHasVoted = !isAuthenticated && !!guestVoteRecord
  const hasYesNoLabels = outcomes.some((o) => {
    const l = getOutcomeLabel(o, locale).toLowerCase()
    return l === 'yes' || l === 'sí' || l === 'si' || l === 'no'
  })
  const isBinary =
    outcomes.length === 2 &&
    (market.market_type === 'binary' || (market.market_type !== 'multi' && hasYesNoLabels))

  const needsUserConfidence = needsUserConfidenceSlider(isBinary, market)

  useEffect(() => {
    if (myVote && isAuthenticated) {
      setSelectedOutcomeId(myVote.outcome_id)
      setConfidence(myVote.confidence)
    }
    if (!myVote && isAuthenticated) {
      setSelectedOutcomeId(null)
      setConfidence(7)
    }
  }, [myVote?.outcome_id, myVote?.confidence, myVote, isAuthenticated])

  useEffect(() => {
    setReasoning('')
  }, [selectedOutcomeId])

  const selectedOutcome = selectedOutcomeId ? outcomes.find((o) => o.id === selectedOutcomeId) : null
  const selectedProb = selectedOutcome ? toDecimal(selectedOutcome.probability) : 0
  const effectiveConfidence = needsUserConfidence
    ? confidence
    : selectedOutcome
      ? autoConfidence(selectedProb)
      : 7

  const handleVote = async () => {
    if (!selectedOutcomeId || loading || isResolved) return
    if (!isAuthenticated && guestHasVoted) return

    setLoading(true)
    try {
      if (!isAuthenticated) {
        if (!guestId) {
          alert(locale === 'es' ? 'Espera un momento…' : 'Please wait…')
          return
        }
        if (typeof window !== 'undefined' && hasGuestVotedMarket(market.id)) {
          alert(locale === 'es' ? 'Ya votaste en este mercado' : 'You already voted on this market')
          return
        }
        const label = getOutcomeLabel(
          outcomes.find((o) => o.id === selectedOutcomeId)!,
          locale
        ).toLowerCase()
        let voteYesNo: 'yes' | 'no' | null = null
        if (label === 'yes' || label === 'sí' || label === 'si') voteYesNo = 'yes'
        else if (label === 'no') voteYesNo = 'no'
        const payload: GuestVotePayload = {
          outcomeId: selectedOutcomeId,
          confidence: effectiveConfidence,
          voteYesNo: isBinary ? voteYesNo : null,
        }
        const res = await fetch('/api/votes/anonymous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            market_id: market.id,
            outcome_id: selectedOutcomeId,
            confidence: effectiveConfidence,
            guest_id: guestId,
            reasoning: normalizeVoteReasoning(reasoning, reasoningMax),
          }),
        })
        const data = await res.json()
        if (data.already_voted) {
          alert(data.message || (locale === 'es' ? 'Ya votaste en este mercado' : 'You already voted on this market'))
          return
        }
        if (!res.ok) {
          alert(data.error || 'Vote failed')
          return
        }
        onAnonymousVoteSuccess?.(payload, {
          total_votes: data.total_votes ?? data.engagement_count,
          engagement_count: data.engagement_count,
        })
        return
      }

      const res = await fetch('/api/predictions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: market.id,
          outcome_id: selectedOutcomeId,
          confidence: effectiveConfidence,
          reasoning: normalizeVoteReasoning(reasoning, reasoningMax),
        }),
      })

      const data = await res.json()
      if (data.success !== false && data.error == null) {
        onVoteSuccess?.({
          xpEarned: data.xp_earned,
          isUpdate: data.is_update === true,
          noChange: data.no_change === true,
        })
      } else {
        alert(data.error || 'Vote failed')
      }
    } catch {
      alert('Vote failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const submitLoadingLabel = locale === 'es' ? 'Enviando…' : 'Submitting...'
  const pickMessageNonPulse =
    selectedOutcomeId && !needsUserConfidence && selectedOutcome
      ? getPickMessageNonPulse(toDecimal(selectedOutcome.probability), loc)
      : null

  const sectionLead = isEditing
    ? copy.yourHeading
    : isPulse
    ? locale === 'es'
      ? 'Comparte tu opinión'
      : 'Share your opinion'
    : locale === 'es'
      ? 'Haz tu predicción'
      : 'Make your prediction'

  const renderOutcomeCard = (o: Outcome) => {
    const isSelected = selectedOutcomeId === o.id
    const pct = Math.round(toDisplayPercent(o.probability || 0))
    const primary = getOutcomeCardLabel(o, locale)
    const hint = bilingualHint(o, locale)
    return (
      <button
        key={o.id}
        type="button"
        onClick={() => setSelectedOutcomeId(isSelected ? null : o.id)}
        className={`
          w-full min-h-[44px] text-left rounded-xl p-4 transition-all duration-200 border
          ${isSelected
            ? 'border-emerald-500 bg-emerald-500/[0.06] shadow-[0_0_0_1px_rgba(16,185,129,0.3)]'
            : 'border-white/10 bg-transparent hover:border-white/20 hover:bg-white/[0.02]'
          }
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-sm font-medium text-white leading-snug">{primary}</p>
            {hint ? <p className="text-[11px] text-gray-500 mt-0.5">({hint})</p> : null}
          </div>
          <div className="text-right shrink-0" style={{ minWidth: 56 }}>
            <span
              className={`text-base font-medium ${isSelected ? 'text-emerald-400' : 'text-gray-400'}`}
            >
              {pct}%
            </span>
            <div className="w-12 h-1 bg-white/[0.08] rounded-full mt-1.5 ml-auto">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isSelected ? 'bg-emerald-500' : 'bg-white/20'
                }`}
                style={{ width: `${Math.min(100, Math.max(pct, 3))}%` }}
              />
            </div>
          </div>
        </div>
        <div className="w-full h-1.5 bg-white/[0.08] rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isSelected ? 'bg-emerald-500' : 'bg-white/15'
            }`}
            style={{ width: `${Math.min(100, Math.max(pct, 2))}%` }}
          />
        </div>
      </button>
    )
  }

  const reasoningBlock =
    selectedOutcomeId && !isResolved && (!guestHasVoted || isAuthenticated) ? (
      <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {locale === 'es' ? '¿Por qué?' : 'Why?'}
            <span className="ml-1 text-gray-600">
              ({locale === 'es' ? 'opcional' : 'optional'})
            </span>
          </span>
          <span className="text-xs text-gray-600">
            {reasoning.length}/{reasoningMax}
          </span>
        </div>
        <textarea
          value={reasoning}
          onChange={(e) => {
            const v = e.target.value
            if (v.length <= reasoningMax) setReasoning(v)
          }}
          placeholder={
            locale === 'es'
              ? 'Comparte brevemente tu razonamiento...'
              : 'Briefly share your reasoning...'
          }
          rows={2}
          className="w-full resize-none rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500/30 focus:outline-none"
        />
        <p className="mt-1.5 text-[11px] text-gray-600">
          {locale === 'es'
            ? 'Tu razonamiento enriquece los datos para todos'
            : 'Your reasoning enriches the data for everyone'}
        </p>
      </div>
    ) : null

  const confidenceBlock =
    selectedOutcomeId && needsUserConfidence ? (
      <div className="mt-4 p-4 bg-white/[0.03] rounded-xl border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">
            {locale === 'es' ? '¿Qué tan seguro estás?' : 'How confident are you?'}
          </span>
          <span className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
            <span className="text-lg">{getConfidenceEmoji(confidence)}</span>
            {confidence}/10
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={confidence}
          onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
          className="cc-range-slider w-full min-h-[44px]"
          style={
            {
              '--cc-range-pct': `${((confidence - 1) / 9) * 100}%`,
            } as CSSProperties
          }
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>{locale === 'es' ? 'No muy seguro' : 'Not very sure'}</span>
          <span>{locale === 'es' ? 'Muy seguro' : 'Very sure'}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">
          {getConfidenceLabel(confidence)}
        </p>
      </div>
    ) : null

  const primarySubmitLabel = submitPrimaryLabel(isPulse, locale, isEditing, copy)

  const submitBlock = selectedOutcomeId ? (
    <div className="mt-4 space-y-3">
      {!needsUserConfidence && pickMessageNonPulse ? (
        <p className="text-amber-400/90 text-sm font-medium">{pickMessageNonPulse}</p>
      ) : null}
      <button
        type="button"
        onClick={handleVote}
        disabled={loading}
        className="w-full min-h-[48px] bg-emerald-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
      >
        {loading ? submitLoadingLabel : primarySubmitLabel}
      </button>
    </div>
  ) : null

  if (isResolved) {
    const winningOutcome = outcomes.find((o) => o.is_winner)
    return (
      <div className="bg-cc-card border border-cc-border rounded-xl p-6">
        <h3 className="font-semibold text-white mb-2">{copy.resolvedTitle}</h3>
        <p className="text-cc-text-secondary text-sm mb-4">
          {loc === 'en'
            ? 'This market has been resolved. Winning outcome:'
            : 'Este mercado está resuelto. Resultado ganador:'}{' '}
          <span className="text-emerald-400 font-medium">
            {winningOutcome ? getOutcomeLabel(winningOutcome, locale) : (market.resolution ?? '—')}
          </span>
        </p>
        {myVote && (
          <div className="p-4 bg-gray-800/50 rounded-lg border border-cc-border/50">
            <p className="text-gray-300 text-sm font-medium">{copy.yourRecorded}</p>
            <p className="text-white mt-1">
              {outcomes.find((o) => o.id === myVote.outcome_id)
                ? getOutcomeLabel(outcomes.find((o) => o.id === myVote.outcome_id)!, locale)
                : myVote.outcome_label}
              {needsUserConfidence && (
                <span className="text-cc-text-secondary">
                  {' '}
                  {loc === 'en' ? 'at confidence' : 'con confianza'} {myVote.confidence}
                </span>
              )}
            </p>
            <p className="text-cc-text-secondary text-sm mt-1">
              {myVote.is_correct ? (
                <span className="text-emerald-400">
                  ✓ Correct! +{myVote.xp_earned + (myVote.bonus_xp || 0)} XP total
                </span>
              ) : (
                <span className="text-cc-text-secondary">+{myVote.xp_earned} XP earned</span>
              )}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (guestHasVoted) {
    const displayOutcomeId = guestVoteRecord?.outcomeId
    const displayConfidence = guestVoteRecord?.confidence
    const outcomeForDisplay = outcomes.find((o) => o.id === displayOutcomeId)
    const sorted = [...outcomes].sort(
      (a, b) => toDecimal(b.probability || 0) - toDecimal(a.probability || 0)
    )
    const shareTitle = getMarketText(market, 'title', locale)
    const sponsorName = (market as { sponsor_name?: string | null }).sponsor_name

    return (
      <div className="bg-cc-card border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-6 border-b border-white/5">
          <div className="text-center mb-6">
            <span className="text-emerald-400 text-2xl">✓</span>
            <p className="text-white font-medium mt-2">
              {isPulse
                ? locale === 'es'
                  ? '¡Opinión registrada!'
                  : 'Opinion recorded!'
                : locale === 'es'
                  ? '¡Predicción registrada!'
                  : 'Prediction recorded!'}
            </p>
          </div>

          <div className="space-y-3">
            {sorted.map((o) => {
              const pct = Math.round(toDisplayPercent(o.probability || 0))
              const isYours = o.id === displayOutcomeId
              return (
                <div key={o.id} className="space-y-1">
                  <div className="flex justify-between text-sm gap-2">
                    <span
                      className={`leading-snug ${isYours ? 'text-emerald-400 font-medium' : 'text-gray-300'}`}
                    >
                      {getOutcomeCardLabel(o, locale)}
                    </span>
                    <span className={`shrink-0 ${isYours ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isYours ? 'bg-emerald-500' : 'bg-white/15'}`}
                      style={{ width: `${Math.min(100, Math.max(pct, 2))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {needsUserConfidence && displayConfidence != null && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              {locale === 'es' ? 'Tu confianza' : 'Your confidence'}: {displayConfidence}/10
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-white/5 flex justify-center">
            <ShareButton marketId={market.id} title={shareTitle} sponsorName={sponsorName ?? undefined} />
          </div>
        </div>

        {relatedMarkets.length > 0 && (
          <div className="px-4 py-4 border-b border-white/5">
            <p className="text-sm font-medium text-gray-400 mb-3">
              {locale === 'es' ? 'También te puede interesar' : 'You might also like'}
            </p>
            <div className="space-y-2">
              {relatedMarkets.map((m) => {
                const title = getMarketText(
                  {
                    title: m.title,
                    translations: m.translations as MarketWithTranslations['translations'],
                  } as MarketWithTranslations,
                  'title',
                  locale
                )
                const n = m.total_votes ?? 0
                const voteWord = m.is_pulse
                  ? locale === 'es'
                    ? 'opiniones'
                    : 'opinions'
                  : locale === 'es'
                    ? 'predicciones'
                    : 'predictions'
                return (
                  <Link
                    key={m.id}
                    href={`/predictions/markets/${m.id}`}
                    className="flex min-h-[44px] items-center justify-between p-3 rounded-xl border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all"
                  >
                    <div className="flex-1 pr-3 min-w-0">
                      <p className="text-sm text-white font-medium leading-snug">{title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {n.toLocaleString()} {voteWord}
                      </p>
                    </div>
                    <span className="text-emerald-400 text-xs font-medium shrink-0">
                      {m.is_pulse
                        ? locale === 'es'
                          ? 'Opinar →'
                          : 'Vote →'
                        : locale === 'es'
                          ? 'Predecir →'
                          : 'Predict →'}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <VotePanelFooter locale={locale} />
      </div>
    )
  }

  if (outcomes.length === 0) {
    return (
      <div className="bg-cc-card border border-cc-border rounded-xl p-6">
        <h3 className="font-semibold text-white mb-2">{copy.emptyHeading}</h3>
        <p className="text-cc-text-secondary text-sm">
          {loc === 'en' ? 'No outcomes available yet.' : 'Aún no hay opciones disponibles.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-cc-card border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 py-4 border-b border-white/5">
        <p className="text-sm font-medium text-gray-400 mb-3">{sectionLead}</p>
        {!isAuthenticated && !guestHasVoted && (
          <p className="text-cc-text-muted text-xs mb-2">
            {locale === 'es' ? 'Vota sin crear cuenta' : 'Vote without creating an account'}
          </p>
        )}
        {isEditing && (
          <p className="text-cc-text-muted text-xs">
            {copy.editSubtitle}
            {myVote ? (
              <span className="block mt-1.5 text-gray-600">
                +{myVote.xp_earned} XP {copy.firstXpNote}
              </span>
            ) : null}
          </p>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="flex flex-col gap-2">{outcomes.map((o) => renderOutcomeCard(o))}</div>

        {confidenceBlock}

        {reasoningBlock}

        {submitBlock}
      </div>

      {!isAuthenticated && (
        <p className="text-[11px] text-gray-600 text-center px-4 pb-4">
          {locale === 'es'
            ? 'Vota sin crear cuenta · Regístrate para ganar XP'
            : 'Vote without creating an account · Sign up to earn XP'}
        </p>
      )}

      <VotePanelFooter locale={locale} />
    </div>
  )
}

function VotePanelFooter({ locale }: { locale: string }) {
  return (
    <div className="px-4 py-4 border-t border-white/5 bg-cc-bg/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/images/logo.png" alt="" className="h-4 w-auto opacity-40 shrink-0" />
          <span className="text-xs text-gray-600 truncate">Powered by Crowd Conscious</span>
        </div>
        <Link
          href="/markets"
          className="text-xs text-emerald-400 font-medium hover:underline shrink-0"
        >
          {locale === 'es' ? 'Explorar más →' : 'Explore more →'}
        </Link>
      </div>
    </div>
  )
}
