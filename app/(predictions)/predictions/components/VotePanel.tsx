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
  getOutcomeSubtitle,
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
import {
  MAX_RANKED_CHOICES,
  OTHER_TEXT_MAX,
  orderedIdsToRankings,
  parseRankings,
  parseVoteMode,
  rankingsToOrderedIds,
} from '@/lib/pulse-vote-ranking'
import {
  DEFAULT_MAX_SELECTIONS,
  parseMaxSelections,
  primaryFromSelections,
  type VoteSelection,
} from '@/lib/multi-select-pulses'
import { CONFIDENCE_UNKNOWN } from '@/lib/post-vote-reveal'
import {
  formatParticipationCount,
  shouldRevealCount,
} from '@/lib/display/participation'

// All three fields are now first-class columns on prediction_markets (see
// migrations 126/129/140 + types/database.ts). Re-declaring them here as
// nullable aliases is just a local-readability nicety so the rest of this
// file can write `market.resolution` etc. without the wider Row union noise.
type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

type Outcome = {
  id: string
  label: string
  /** Optional one-line detail (migration 214). Spanish lives here; non-ES in `translations`. */
  subtitle?: string | null
  probability: number
  vote_count: number
  total_confidence: number
  is_winner: boolean | null
  translations?: Record<string, { label?: string; subtitle?: string }> | null
  is_other?: boolean | null
}

type MyVote = {
  outcome_id: string
  outcome_label: string
  confidence: number
  xp_earned: number
  is_correct: boolean | null
  bonus_xp: number
  rankings?: { outcome_id: string; rank: number }[] | null
  other_text?: string | null
  selections?: { outcome_id: string; confidence: number }[] | null
}

export type RelatedMarketBrief = {
  id: string
  title: string
  translations?: { en?: { title?: string } } | null
  total_votes: number | null
  is_pulse: boolean
  category: string
}

const CONFIDENCE_LABELS_EN: Record<number, string> = {
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

const CONFIDENCE_LABELS_ES: Record<number, string> = {
  1: 'Puro tiro al aire',
  2: 'Una corazonada',
  3: 'Una corazonada',
  4: 'Creo que sí',
  5: 'Creo que sí',
  6: 'Bastante seguro',
  7: 'Bastante seguro',
  8: 'Muy seguro',
  9: 'Muy seguro',
  10: 'Totalmente seguro',
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

function getConfidenceLabel(n: number, locale: string): string {
  const clamped = Math.min(10, Math.max(1, n))
  if (locale === 'es') {
    return CONFIDENCE_LABELS_ES[clamped] || 'Creo que sí'
  }
  return CONFIDENCE_LABELS_EN[clamped] || 'I think so'
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPulse: boolean,
  locale: string,
  isEditing: boolean,
  copy: ReturnType<typeof voteActionCopy>
): string {
  if (isEditing) return copy.updateVerb
  return locale === 'es' ? 'Enviar voto' : 'Submit vote'
}

export type GuestVotePayload = {
  outcomeId: string
  confidence: number
  voteYesNo: 'yes' | 'no' | null
  rankings?: { outcome_id: string; rank: number }[]
  selections?: VoteSelection[]
  otherText?: string | null
}

interface VotePanelProps {
  market: PredictionMarket
  outcomes: Outcome[]
  myVote: MyVote | null
  onVoteSuccess?: (payload: {
    xpEarned?: number
    isUpdate?: boolean
    noChange?: boolean
    /** Outcome the user just voted for — surfaced for the post-vote screen. */
    outcomeId?: string
    /** Confidence (1..10) the user just submitted. */
    confidence?: number
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
  const [rankedIds, setRankedIds] = useState<string[]>([])
  const [multiIds, setMultiIds] = useState<string[]>([])
  const [multiConf, setMultiConf] = useState<Record<string, number>>({})
  const [multiTouched, setMultiTouched] = useState<Record<string, boolean>>({})
  const [multiUnknown, setMultiUnknown] = useState<Record<string, boolean>>({})
  // Phase 1: untouched slider is not a vote. Visual rest position is 5;
  // submission requires an explicit touch or "No lo sé" (confidence 0).
  const [confidence, setConfidence] = useState(5)
  const [confidenceTouched, setConfidenceTouched] = useState(false)
  const [confidenceUnknown, setConfidenceUnknown] = useState(false)
  const [reasoning, setReasoning] = useState('')
  const [otherText, setOtherText] = useState('')
  const [loading, setLoading] = useState(false)

  const voteMode = parseVoteMode((market as { vote_mode?: string }).vote_mode)
  const isRanked = voteMode === 'ranked'
  const isMulti = voteMode === 'multi'
  const maxSelections = parseMaxSelections(
    (market as { max_selections?: number }).max_selections
  ) || DEFAULT_MAX_SELECTIONS

  const reasoningMax = voteReasoningMaxForMarket(market.is_micro_market)

  const isResolved = market.status === 'resolved'
  // Closed by date: the advertised end date has passed but the auto-resolve
  // cron may not have flipped status to 'resolved' yet. Voting is blocked in the
  // RPCs at this point, so the UI must stop inviting votes too.
  const resolutionDateMs = market.resolution_date
    ? new Date(market.resolution_date).getTime()
    : NaN
  const isPastCloseDate =
    !isResolved && Number.isFinite(resolutionDateMs) && resolutionDateMs <= Date.now()
  const isClosed = isResolved || isPastCloseDate
  const isEditing = isAuthenticated && !!myVote
  const guestHasVoted = !isAuthenticated && !!guestVoteRecord
  // Single source of truth for "should the per-option community % be visible".
  // Pre-vote we hide the numbers to remove anchoring bias; resolved/closed
  // markets always reveal them so people can see the community outcome.
  const hasVoted = isEditing || guestHasVoted
  const shouldRevealResults = hasVoted || isClosed
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
      const known = myVote.confidence >= 1 && myVote.confidence <= 10
      setConfidence(known ? myVote.confidence : 5)
      setConfidenceTouched(known)
      setConfidenceUnknown(myVote.confidence === CONFIDENCE_UNKNOWN)
      const fromRankings = rankingsToOrderedIds(parseRankings(myVote.rankings))
      setRankedIds(fromRankings.length > 0 ? fromRankings : [myVote.outcome_id])
      setOtherText(myVote.other_text ?? '')

      if (myVote.selections && myVote.selections.length > 0) {
        const ids = myVote.selections.map((s) => s.outcome_id)
        setMultiIds(ids)
        const conf: Record<string, number> = {}
        const touched: Record<string, boolean> = {}
        const unknown: Record<string, boolean> = {}
        for (const s of myVote.selections) {
          const sKnown = s.confidence >= 1 && s.confidence <= 10
          conf[s.outcome_id] = sKnown ? s.confidence : 5
          touched[s.outcome_id] = sKnown
          unknown[s.outcome_id] = s.confidence === CONFIDENCE_UNKNOWN
        }
        setMultiConf(conf)
        setMultiTouched(touched)
        setMultiUnknown(unknown)
      } else if (isMulti) {
        setMultiIds([myVote.outcome_id])
        setMultiConf({ [myVote.outcome_id]: known ? myVote.confidence : 5 })
        setMultiTouched({ [myVote.outcome_id]: known })
        setMultiUnknown({ [myVote.outcome_id]: myVote.confidence === CONFIDENCE_UNKNOWN })
      } else {
        setMultiIds([])
        setMultiConf({})
        setMultiTouched({})
        setMultiUnknown({})
      }
    }
    if (!myVote && isAuthenticated) {
      setSelectedOutcomeId(null)
      setRankedIds([])
      setMultiIds([])
      setMultiConf({})
      setMultiTouched({})
      setMultiUnknown({})
      setConfidence(5)
      setConfidenceTouched(false)
      setConfidenceUnknown(false)
      setOtherText('')
    }
  }, [myVote?.outcome_id, myVote?.confidence, myVote, isAuthenticated, isMulti])

  useEffect(() => {
    setReasoning('')
  }, [selectedOutcomeId])

  const buildMultiSelections = (): VoteSelection[] =>
    multiIds.map((id) => ({
      outcome_id: id,
      confidence: multiUnknown[id] ? CONFIDENCE_UNKNOWN : (multiConf[id] ?? 5),
    }))

  const selectedOutcome = selectedOutcomeId ? outcomes.find((o) => o.id === selectedOutcomeId) : null
  const multiSelections = isMulti ? buildMultiSelections() : []
  const primaryOutcomeId = isMulti
    ? multiSelections.length > 0
      ? primaryFromSelections(multiSelections).outcome_id
      : (multiIds[0] ?? null)
    : isRanked
      ? (rankedIds[0] ?? null)
      : selectedOutcomeId
  const primaryOutcome = primaryOutcomeId ? outcomes.find((o) => o.id === primaryOutcomeId) : null
  const includesOther = isMulti
    ? multiIds.some((id) => outcomes.find((o) => o.id === id)?.is_other)
    : isRanked
      ? rankedIds.some((id) => outcomes.find((o) => o.id === id)?.is_other)
      : Boolean(selectedOutcome?.is_other)
  const otherTextOk = !includesOther || otherText.trim().length > 0
  const confidenceReady =
    !needsUserConfidence || confidenceTouched || confidenceUnknown
  const multiConfidenceReady =
    multiIds.length > 0 &&
    multiIds.every((id) => multiTouched[id] === true || multiUnknown[id] === true)
  const canSubmit = isMulti
    ? multiIds.length >= 1 && multiConfidenceReady && otherTextOk
    : Boolean(primaryOutcomeId) && otherTextOk && confidenceReady
  const effectiveConfidence = isMulti
    ? multiSelections.length > 0
      ? primaryFromSelections(multiSelections).confidence
      : CONFIDENCE_UNKNOWN
    : needsUserConfidence
      ? confidenceUnknown
        ? CONFIDENCE_UNKNOWN
        : confidence
      : primaryOutcome
        ? autoConfidence(toDecimal(primaryOutcome.probability))
        : 5

  const toggleRankedOutcome = (id: string) => {
    setRankedIds((prev) => {
      const idx = prev.indexOf(id)
      if (idx >= 0) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_RANKED_CHOICES) return prev
      return [...prev, id]
    })
  }

  const toggleMultiOutcome = (id: string) => {
    setMultiIds((prev) => {
      const idx = prev.indexOf(id)
      if (idx >= 0) return prev.filter((x) => x !== id)
      if (prev.length >= maxSelections) return prev
      return [...prev, id]
    })
    setMultiConf((prev) => (prev[id] == null ? { ...prev, [id]: 5 } : prev))
  }

  const handleVote = async () => {
    if (!primaryOutcomeId || loading || isClosed || !canSubmit) return
    if (!isAuthenticated && guestHasVoted) return

    const rankingsPayload = isRanked ? orderedIdsToRankings(rankedIds) : undefined
    const selectionsPayload = isMulti ? buildMultiSelections() : undefined
    const otherPayload = includesOther ? otherText.trim() : undefined

    setLoading(true)
    try {
      if (!isAuthenticated) {
        if (!guestId) {
          alert(locale === 'es' ? 'Espera un momento…' : 'Please wait…')
          return
        }
        if (typeof window !== 'undefined' && hasGuestVotedMarket(market.id)) {
          alert(locale === 'es' ? 'Ya votaste en este Pulse' : 'You already voted on this Pulse')
          return
        }
        const label = getOutcomeLabel(
          outcomes.find((o) => o.id === primaryOutcomeId)!,
          locale
        ).toLowerCase()
        let voteYesNo: 'yes' | 'no' | null = null
        if (label === 'yes' || label === 'sí' || label === 'si') voteYesNo = 'yes'
        else if (label === 'no') voteYesNo = 'no'
        const payload: GuestVotePayload = {
          outcomeId: primaryOutcomeId,
          confidence: effectiveConfidence,
          voteYesNo: isBinary ? voteYesNo : null,
          rankings: rankingsPayload,
          selections: selectionsPayload,
          otherText: otherPayload ?? null,
        }
        const res = await fetch('/api/votes/anonymous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            market_id: market.id,
            outcome_id: primaryOutcomeId,
            confidence: effectiveConfidence,
            guest_id: guestId,
            reasoning: normalizeVoteReasoning(reasoning, reasoningMax),
            rankings: rankingsPayload,
            selections: selectionsPayload,
            other_text: otherPayload,
          }),
        })
        const data = await res.json()
        if (data.already_voted) {
          alert(data.message || (locale === 'es' ? 'Ya votaste en este Pulse' : 'You already voted on this Pulse'))
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
          outcome_id: primaryOutcomeId,
          confidence: effectiveConfidence,
          reasoning: normalizeVoteReasoning(reasoning, reasoningMax),
          rankings: rankingsPayload,
          selections: selectionsPayload,
          other_text: otherPayload,
        }),
      })

      const data = await res.json()
      if (data.success !== false && data.error == null) {
        onVoteSuccess?.({
          xpEarned: data.xp_earned,
          isUpdate: data.is_update === true,
          noChange: data.no_change === true,
          outcomeId: primaryOutcomeId,
          confidence: effectiveConfidence,
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
    primaryOutcomeId && !needsUserConfidence && primaryOutcome
      ? getPickMessageNonPulse(toDecimal(primaryOutcome.probability), loc)
      : null

  const sectionLead = isEditing
    ? copy.yourHeading
    : isMulti
      ? locale === 'es'
        ? `Puedes elegir hasta ${maxSelections} opciones`
        : `You can pick up to ${maxSelections} options`
      : isRanked
        ? locale === 'es'
          ? 'Elige hasta 3 opciones, en orden'
          : 'Pick up to 3 options, in order'
        : locale === 'es'
          ? 'Elige tu voto'
          : 'Pick your vote'

  const renderOutcomeCard = (o: Outcome) => {
    const rankIndex = isRanked ? rankedIds.indexOf(o.id) : -1
    const isSelected = isMulti
      ? multiIds.includes(o.id)
      : isRanked
        ? rankIndex >= 0
        : selectedOutcomeId === o.id
    const rankNumber = rankIndex >= 0 ? rankIndex + 1 : null
    const pct = Math.round(toDisplayPercent(o.probability || 0))
    const primary = getOutcomeCardLabel(o, locale)
    const hint = bilingualHint(o, locale)
    const subtitle = getOutcomeSubtitle(o, locale)
    return (
      <button
        type="button"
        onClick={() => {
          if (isMulti) toggleMultiOutcome(o.id)
          else if (isRanked) toggleRankedOutcome(o.id)
          else setSelectedOutcomeId(isSelected ? null : o.id)
        }}
        aria-pressed={isSelected}
        className={`
          w-full min-h-[52px] text-left rounded-xl px-4 py-3.5 transition-all duration-200 border
          ${isSelected
            ? 'border-emerald-500 bg-emerald-500/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.3)]'
            : 'border-white/10 bg-transparent hover:border-white/25 hover:bg-white/[0.03] active:bg-white/[0.05]'
          }
        `}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              aria-hidden
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-white/25 bg-transparent text-transparent'
              }`}
            >
              {isRanked && rankNumber ? (
                rankNumber
              ) : (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white leading-snug">{primary}</p>
              {subtitle ? (
                <p className="mt-1 text-sm leading-snug text-gray-400">{subtitle}</p>
              ) : null}
              {hint ? <p className="text-[11px] text-gray-500 mt-0.5">({hint})</p> : null}
              {isRanked && isSelected ? (
                <p className="mt-0.5 text-[11px] text-emerald-400/80">
                  {rankNumber === 1
                    ? locale === 'es'
                      ? '1.ª preferencia'
                      : '1st preference'
                    : rankNumber === 2
                      ? locale === 'es'
                        ? '2.ª preferencia'
                        : '2nd preference'
                      : locale === 'es'
                        ? '3.ª preferencia'
                        : '3rd preference'}
                </p>
              ) : null}
            </div>
          </div>
          <div className="text-right shrink-0">
            {shouldRevealResults ? (
              <span
                key="pct-revealed"
                className={`text-xs font-medium animate-[fade-in_300ms_ease-out] ${
                  isSelected ? 'text-emerald-400' : 'text-gray-500'
                }`}
                aria-live="polite"
              >
                {pct}%
              </span>
            ) : (
              <span aria-hidden className="text-xs font-medium text-transparent">
                00%
              </span>
            )}
          </div>
        </div>
      </button>
    )
  }

  const renderMultiOptionConfidence = (outcomeId: string) => {
    const conf = multiConf[outcomeId] ?? 5
    const touched = multiTouched[outcomeId] === true
    const unknown = multiUnknown[outcomeId] === true
    const ready = touched || unknown
    return (
      <div
        key={`conf-${outcomeId}`}
        className="mt-1.5 mb-1 p-3 bg-white/[0.03] rounded-xl border border-white/5"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">
            {locale === 'es' ? '¿Qué tan seguro estás?' : 'How confident are you?'}
          </span>
          <span className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
            {unknown ? (
              locale === 'es' ? 'No lo sé' : "I don't know"
            ) : touched ? (
              <>
                <span className="text-lg">{getConfidenceEmoji(conf)}</span>
                {conf}/10
              </>
            ) : (
              <span className="text-gray-500">
                {locale === 'es' ? 'Elige tu certeza' : 'Set your certainty'}
              </span>
            )}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={conf}
          disabled={unknown}
          onChange={(e) => {
            const next = parseInt(e.target.value, 10)
            setMultiUnknown((prev) => ({ ...prev, [outcomeId]: false }))
            setMultiTouched((prev) => ({ ...prev, [outcomeId]: true }))
            setMultiConf((prev) => ({ ...prev, [outcomeId]: next }))
          }}
          className="cc-range-slider w-full min-h-[44px] disabled:opacity-40"
          style={
            {
              '--cc-range-pct': `${((conf - 1) / 9) * 100}%`,
            } as CSSProperties
          }
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>{locale === 'es' ? 'No estoy seguro' : 'Not sure'}</span>
          <span>{locale === 'es' ? 'Totalmente seguro' : 'Absolutely certain'}</span>
        </div>
        {touched && !unknown ? (
          <p className="text-[11px] text-gray-500 mt-2">
            {getConfidenceLabel(conf, locale)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setMultiUnknown((prev) => ({ ...prev, [outcomeId]: true }))
            setMultiTouched((prev) => ({ ...prev, [outcomeId]: false }))
          }}
          aria-pressed={unknown}
          className={`mt-3 inline-flex min-h-[44px] items-center rounded-lg border px-3 text-xs transition-colors ${
            unknown
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200'
          }`}
        >
          {locale === 'es' ? 'No lo sé' : "I don't know"}
        </button>
        <p className="mt-1.5 text-[11px] text-gray-600">
          {locale === 'es'
            ? 'Registra tu opción sin sumar a la certeza promedio.'
            : 'Records your option without adding to the confidence average.'}
        </p>
        {!ready ? (
          <p className="mt-2 text-[11px] text-amber-400/90">
            {locale === 'es'
              ? 'Mueve el control o elige “No lo sé” para enviar.'
              : 'Move the slider or choose “I don’t know” to submit.'}
          </p>
        ) : null}
      </div>
    )
  }

  const reasoningBlock =
    primaryOutcomeId && !isResolved && (!guestHasVoted || isAuthenticated) ? (
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

  const otherTextBlock =
    includesOther && !isResolved && (!guestHasVoted || isAuthenticated) ? (
      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-gray-300">
            {locale === 'es' ? 'Tu respuesta en Otro' : 'Your Other answer'}
            <span className="ml-1 text-red-400">*</span>
          </span>
          <span className="text-xs text-gray-600">
            {otherText.length}/{OTHER_TEXT_MAX}
          </span>
        </div>
        <input
          type="text"
          value={otherText}
          onChange={(e) => {
            const v = e.target.value
            if (v.length <= OTHER_TEXT_MAX) setOtherText(v)
          }}
          placeholder={
            locale === 'es' ? 'Escribe tu opción (máx. 120)' : 'Type your option (max 120)'
          }
          maxLength={OTHER_TEXT_MAX}
          className="w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500/30 focus:outline-none"
        />
        {!otherTextOk ? (
          <p className="mt-1.5 text-[11px] text-amber-400/90">
            {locale === 'es'
              ? 'Requerido si eliges Otro'
              : 'Required when you pick Other'}
          </p>
        ) : null}
      </div>
    ) : null

  const confidenceBlock =
    !isMulti && primaryOutcomeId && needsUserConfidence ? (
      <div className="mt-4 p-4 bg-white/[0.03] rounded-xl border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">
            {locale === 'es' ? '¿Qué tan seguro estás?' : 'How confident are you?'}
          </span>
          <span className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
            {confidenceUnknown ? (
              locale === 'es' ? 'No lo sé' : "I don't know"
            ) : confidenceTouched ? (
              <>
                <span className="text-lg">{getConfidenceEmoji(confidence)}</span>
                {confidence}/10
              </>
            ) : (
              <span className="text-gray-500">
                {locale === 'es' ? 'Elige tu certeza' : 'Set your certainty'}
              </span>
            )}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={confidence}
          disabled={confidenceUnknown}
          onChange={(e) => {
            setConfidenceUnknown(false)
            setConfidenceTouched(true)
            setConfidence(parseInt(e.target.value, 10))
          }}
          className="cc-range-slider w-full min-h-[44px] disabled:opacity-40"
          style={
            {
              '--cc-range-pct': `${((confidence - 1) / 9) * 100}%`,
            } as CSSProperties
          }
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>{locale === 'es' ? 'No estoy seguro' : 'Not sure'}</span>
          <span>{locale === 'es' ? 'Totalmente seguro' : 'Absolutely certain'}</span>
        </div>
        {confidenceTouched && !confidenceUnknown ? (
          <p className="text-[11px] text-gray-500 mt-2">
            {getConfidenceLabel(confidence, locale)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setConfidenceUnknown(true)
            setConfidenceTouched(false)
          }}
          aria-pressed={confidenceUnknown}
          className={`mt-3 inline-flex min-h-[44px] items-center rounded-lg border px-3 text-xs transition-colors ${
            confidenceUnknown
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200'
          }`}
        >
          {locale === 'es' ? 'No lo sé' : "I don't know"}
        </button>
        <p className="mt-1.5 text-[11px] text-gray-600">
          {locale === 'es'
            ? 'Registra tu opción sin sumar a la certeza promedio.'
            : 'Records your option without adding to the confidence average.'}
        </p>
        {!confidenceReady ? (
          <p className="mt-2 text-[11px] text-amber-400/90">
            {locale === 'es'
              ? 'Mueve el control o elige “No lo sé” para enviar.'
              : 'Move the slider or choose “I don’t know” to submit.'}
          </p>
        ) : null}
      </div>
    ) : null

  const primarySubmitLabel = submitPrimaryLabel(isPulse, locale, isEditing, copy)

  const submitBlock = primaryOutcomeId ? (
    <div className="mt-4 space-y-3">
      {!needsUserConfidence && pickMessageNonPulse ? (
        <p className="text-amber-400/90 text-sm font-medium">{pickMessageNonPulse}</p>
      ) : null}
      <button
        type="button"
        onClick={handleVote}
        disabled={loading || !canSubmit}
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
            ? 'Voting is closed. Community outcome:'
            : 'La votación cerró. Resultado de la comunidad:'}{' '}
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
                  {loc === 'en'
                    ? '✓ Matched the community outcome'
                    : '✓ Coincide con el resultado de la comunidad'}
                </span>
              ) : myVote.is_correct === false ? (
                <span className="text-cc-text-secondary">
                  {loc === 'en'
                    ? 'Recorded — thanks for voting'
                    : 'Registrado — gracias por votar'}
                </span>
              ) : (
                <span className="text-cc-text-secondary">
                  {loc === 'en' ? 'Thanks for voting' : 'Gracias por votar'}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (isPastCloseDate) {
    const sorted = [...outcomes].sort(
      (a, b) => toDecimal(b.probability || 0) - toDecimal(a.probability || 0)
    )
    return (
      <div className="bg-cc-card border border-cc-border rounded-xl p-6">
        <h3 className="font-semibold text-white mb-2">
          {loc === 'en' ? 'Pulse closed' : 'Pulse cerrado'}
        </h3>
        <p className="text-cc-text-secondary text-sm mb-4">
          {loc === 'en'
            ? 'Voting has closed. Final community results are being tallied.'
            : 'La votación cerró. Se están contabilizando los resultados finales de la comunidad.'}
        </p>
        <div className="space-y-3">
          {sorted.map((o) => {
            const pct = Math.round(toDisplayPercent(o.probability || 0))
            const subtitle = getOutcomeSubtitle(o, locale)
            const isYours = myVote?.outcome_id === o.id
            return (
              <div key={o.id} className="space-y-1">
                <div className="flex justify-between text-sm gap-2">
                  <div className="min-w-0">
                    <span
                      className={`block leading-snug ${
                        isYours ? 'text-emerald-400 font-medium' : 'text-gray-300'
                      }`}
                    >
                      {getOutcomeCardLabel(o, locale)}
                    </span>
                    {subtitle ? (
                      <span className="block text-sm leading-snug text-gray-500">{subtitle}</span>
                    ) : null}
                  </div>
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
      </div>
    )
  }

  if (guestHasVoted) {
    const displayOutcomeId = guestVoteRecord?.outcomeId
    const displayConfidence = guestVoteRecord?.confidence
    const sorted = [...outcomes].sort(
      (a, b) => toDecimal(b.probability || 0) - toDecimal(a.probability || 0)
    )
    const shareTitle = getMarketText(market, 'title', locale)
    const sponsorName = (market as { sponsor_name?: string | null }).sponsor_name
    const voteN = Math.max(
      Number(market.total_votes ?? 0),
      outcomes.reduce((s, o) => s + (o.vote_count ?? 0), 0)
    )
    const showBars = shouldRevealCount(voteN)

    return (
      <div className="bg-cc-card border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-6 border-b border-white/5">
          <div className="text-center mb-6">
            <span className="text-emerald-400 text-2xl">✓</span>
            <p className="text-white font-medium mt-2">
              {locale === 'es' ? '¡Voto registrado!' : 'Vote recorded!'}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {showBars
                ? formatParticipationCount(voteN, loc)
                : locale === 'es'
                  ? 'Eres de los primeros en opinar.'
                  : 'You’re one of the first voices.'}
            </p>
          </div>

          {showBars ? (
            <div className="space-y-3">
              {sorted.map((o) => {
                const pct = Math.round(toDisplayPercent(o.probability || 0))
                const isYours = o.id === displayOutcomeId
                const subtitle = getOutcomeSubtitle(o, locale)
                return (
                  <div key={o.id} className="space-y-1">
                    <div className="flex justify-between text-sm gap-2">
                      <div className="min-w-0">
                        <span
                          className={`block leading-snug ${
                            isYours ? 'text-emerald-400 font-medium' : 'text-gray-300'
                          }`}
                        >
                          {getOutcomeCardLabel(o, locale)}
                        </span>
                        {subtitle ? (
                          <span className="block text-sm leading-snug text-gray-500">
                            {subtitle}
                          </span>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 ${isYours ? 'text-emerald-400' : 'text-gray-500'}`}
                      >
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
          ) : (
            <p className="text-center text-sm text-gray-400">
              {locale === 'es'
                ? 'Te avisamos cuando haya suficientes votos para comparar certezas.'
                : 'We’ll let you know when there are enough votes to compare certainty.'}
            </p>
          )}

          {needsUserConfidence && displayConfidence != null && displayConfidence >= 1 && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              {locale === 'es' ? 'Tu confianza' : 'Your confidence'}: {displayConfidence}/10
            </p>
          )}
          {needsUserConfidence && displayConfidence === CONFIDENCE_UNKNOWN && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              {locale === 'es' ? 'Certeza: No lo sé' : 'Certainty: I don’t know'}
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-white/5 flex justify-center">
            <ShareButton marketId={market.id} title={shareTitle} sponsorName={sponsorName ?? undefined} />
          </div>

          {!isAuthenticated && (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 text-center">
              <p className="text-sm text-white font-medium">
                {locale === 'es' ? '¡Voto registrado!' : 'Vote saved!'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {locale === 'es'
                  ? 'Crea tu cuenta para que podamos avisarte cuando esto se mueva.'
                  : 'Create an account so we can tell you when this moves.'}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={`/signup?redirect=${encodeURIComponent(`/predictions/markets/${market.id}`)}`}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
                >
                  {locale === 'es' ? 'Crear cuenta →' : 'Create account →'}
                </Link>
                <Link
                  href="/pulse"
                  className="inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-white/25"
                >
                  {locale === 'es' ? 'Seguir votando' : 'Keep voting'}
                </Link>
              </div>
            </div>
          )}
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
                return (
                  <Link
                    key={m.id}
                    href={`/predictions/markets/${m.id}`}
                    className="flex min-h-[44px] items-center justify-between p-3 rounded-xl border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all"
                  >
                    <div className="flex-1 pr-3 min-w-0">
                      <p className="text-sm text-white font-medium leading-snug">{title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatParticipationCount(n, loc)}
                      </p>
                    </div>
                    <span className="text-emerald-400 text-xs font-medium shrink-0">
                      {locale === 'es' ? 'Votar →' : 'Vote →'}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
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
          </p>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="flex flex-col gap-2">
          {outcomes.map((o) => (
            <div key={o.id}>
              {renderOutcomeCard(o)}
              {isMulti && multiIds.includes(o.id)
                ? renderMultiOptionConfidence(o.id)
                : null}
            </div>
          ))}
        </div>
        {isRanked && !shouldRevealResults ? (
          <p className="mt-2 text-[11px] text-gray-500 text-center">
            {locale === 'es'
              ? 'Toca para ordenar (1, 2, 3). Solo la primera cuenta para el resultado ponderado.'
              : 'Tap to order (1, 2, 3). Only first choice counts toward the weighted result.'}
          </p>
        ) : null}
        {isMulti && !shouldRevealResults ? (
          <p className="mt-2 text-[11px] text-gray-500 text-center">
            {locale === 'es'
              ? 'Marca la certeza de cada opción que elijas (o “No lo sé”).'
              : 'Set certainty on each option you pick (or “I don’t know”).'}
          </p>
        ) : null}

        {!shouldRevealResults && (
          <p className="mt-3 text-[11px] text-gray-500 text-center">
            {locale === 'es'
              ? 'Vota para ver lo que opina la comunidad.'
              : 'Vote to see what the community thinks.'}
          </p>
        )}

        {confidenceBlock}

        {otherTextBlock}

        {reasoningBlock}

        {submitBlock}
      </div>

      {!isAuthenticated && (
        <p className="text-[11px] text-gray-600 text-center px-4 pb-4">
          {locale === 'es'
            ? 'Vota sin crear cuenta · Regístrate después para recordar lo que respaldaste'
            : 'Vote without an account · Sign up later to remember what you supported'}
        </p>
      )}
    </div>
  )
}
