'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import { Check, TrendingUp, TrendingDown } from 'lucide-react'
import type { Database } from '@/types/database'
import { hasGuestVotedMarket } from '@/lib/guest-vote-storage'
import { toDisplayPercent } from '@/lib/probability-utils'
import { getOutcomeLabel } from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'
import {
  getPickMessageNonPulse,
  isPulseLikeMarket,
  voteActionCopy,
} from '@/lib/i18n/pulse-market-copy'

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
  if (selectedOutcomeProbability > 0.7) return 5 // Picking the favorite
  if (selectedOutcomeProbability > 0.4) return 7 // Picking a contender
  if (selectedOutcomeProbability > 0.2) return 8 // Picking an underdog
  return 9 // Picking a long shot
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
  /** Browser guest UUID; required when submitting anonymous vote */
  guestId?: string | null
  guestVoteRecord?: GuestVotePayload | null
  /** After successful POST /api/votes/anonymous */
  onAnonymousVoteSuccess?: (
    payload: GuestVotePayload,
    meta: { total_votes?: number; engagement_count?: number }
  ) => void
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
}: VotePanelProps) {
  const locale = useLocale()
  const loc = locale === 'en' ? 'en' : 'es'
  const isPulse = isPulseLikeMarket(market)
  const copy = voteActionCopy(loc, isPulse)
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(7)
  const [loading, setLoading] = useState(false)

  const isResolved = market.status === 'resolved'
  const isEditing = isAuthenticated && !!myVote
  const guestHasVoted = !isAuthenticated && !!guestVoteRecord
  const guestPreviewOnly = guestHasVoted
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

    return (
      <div className="bg-cc-card border border-cc-border rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">{copy.guestYour}</h3>
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <p className="text-emerald-400 font-medium flex items-center gap-2">
            <Check className="w-4 h-4" />
            {outcomeForDisplay
              ? getOutcomeLabel(outcomeForDisplay, locale)
              : myVote?.outcome_label ?? '—'}
            {needsUserConfidence && displayConfidence != null && (
              <span className="text-cc-text-secondary font-normal">at confidence {displayConfidence}</span>
            )}
          </p>
          <p className="text-cc-text-secondary text-sm mt-2">
            {locale === 'en'
              ? 'Your vote counts toward the market. Create an account to earn XP and appear on the leaderboard.'
              : 'Tu voto cuenta para el mercado. Crea una cuenta para ganar XP y aparecer en el ranking.'}
          </p>
        </div>
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

  const predictLabel = isEditing ? copy.updateVerb : copy.predictVerb
  const submitLoadingLabel = locale === 'es' ? 'Enviando…' : 'Submitting...'

  return (
    <div className="bg-cc-card border border-cc-border rounded-xl p-6">
      <h3 className="font-semibold text-white mb-4">
        {isEditing ? copy.yourHeading : copy.makeHeading}
      </h3>
      {!isAuthenticated && !guestHasVoted && (
        <p className="text-cc-text-muted text-xs mb-3">
          {locale === 'es' ? 'Vota sin crear cuenta' : 'Vote without creating an account'}
        </p>
      )}
      {isEditing && (
        <p className="text-cc-text-muted text-xs mb-4">
          {copy.editSubtitle}
          {myVote ? (
            <span className="block mt-1.5 text-gray-600">
              +{myVote.xp_earned} XP {copy.firstXpNote}
            </span>
          ) : null}
        </p>
      )}

      {isBinary ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {outcomes.map((o) => {
              const label = getOutcomeLabel(o, locale)
              const isYes = label.toLowerCase() === 'yes' || label.toLowerCase() === 'sí' || label.toLowerCase() === 'si'
              const isSelected = selectedOutcomeId === o.id
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedOutcomeId(o.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg font-medium text-sm transition-all ${
                    isSelected
                      ? isYes
                        ? 'bg-emerald-600 text-white border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
                        : 'bg-red-600 text-white border-2 border-red-500 shadow-lg shadow-red-500/20'
                      : 'bg-transparent border-2 border-cc-border text-gray-500 hover:border-cc-border-light hover:text-gray-400'
                  }`}
                >
                  {isYes ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  I think {label.toUpperCase()}
                </button>
              )
            })}
          </div>

          <div className="rounded-lg border border-cc-border bg-gray-800/50 p-4">
            <p className="text-gray-300 font-medium mb-2 flex items-center gap-2">
              <span className="text-xl">{getConfidenceEmoji(confidence)}</span>
              {getConfidenceLabel(confidence)} ({confidence}/10)
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
                className="cc-range-slider min-w-0 flex-1"
                style={
                  {
                    '--cc-range-pct': `${((confidence - 1) / 9) * 100}%`,
                  } as CSSProperties
                }
              />
            </div>
          </div>

          <button
            onClick={handleVote}
            disabled={!selectedOutcomeId || loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? submitLoadingLabel : predictLabel}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {outcomes.map((o) => {
            const isSelected = selectedOutcomeId === o.id
            const probDecimal = toDecimal(o.probability)
            const pickMessage =
              isSelected && !needsUserConfidence
                ? getPickMessageNonPulse(probDecimal, loc)
                : null
            return (
              <div
                key={o.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOutcomeId(isSelected ? null : o.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedOutcomeId(isSelected ? null : o.id)
                  }
                }}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                    : 'border-cc-border bg-gray-800/50 hover:border-cc-border-light'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{getOutcomeLabel(o, locale)}</p>
                    <p className="text-cc-text-secondary text-sm">
                      {loc === 'es' ? 'Actualmente' : 'Currently'}:{' '}
                      {Math.round(toDisplayPercent(o.probability || 0))}% · {o.vote_count} {copy.voteCountWord}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {isSelected ? (locale === 'en' ? 'Selected' : 'Seleccionado') : (locale === 'en' ? 'Pick' : 'Elegir')}
                  </span>
                </div>
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-cc-border">
                    {needsUserConfidence ? (
                      <>
                        <div className="rounded-lg border border-cc-border bg-gray-800/50 p-4 mb-3">
                          <p className="text-gray-300 font-medium mb-2 flex items-center gap-2">
                            <span className="text-xl">{getConfidenceEmoji(confidence)}</span>
                            {getConfidenceLabel(confidence)} ({confidence}/10)
                          </p>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={1}
                              max={10}
                              value={confidence}
                              onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
                              onClick={(e) => e.stopPropagation()}
                              className="cc-range-slider min-w-0 flex-1"
                              style={
                                {
                                  '--cc-range-pct': `${((confidence - 1) / 9) * 100}%`,
                                } as CSSProperties
                              }
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVote()
                          }}
                          disabled={loading}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                        >
                          {loading ? submitLoadingLabel : predictLabel}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-amber-400/90 text-sm font-medium mb-3">{pickMessage}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVote()
                          }}
                          disabled={loading}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                        >
                          {loading ? submitLoadingLabel : predictLabel}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
