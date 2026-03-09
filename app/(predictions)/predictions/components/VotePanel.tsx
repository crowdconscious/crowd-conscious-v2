'use client'

import { useState } from 'react'
import { Check, TrendingUp, TrendingDown } from 'lucide-react'
import type { Database } from '@/types/database'
import { toDisplayPercent } from '@/lib/probability-utils'
import { getOutcomeLabel } from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'

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

interface VotePanelProps {
  market: PredictionMarket
  outcomes: Outcome[]
  myVote: MyVote | null
  onVoteSuccess?: (xpGained?: number) => void
}

export function VotePanel({ market, outcomes, myVote, onVoteSuccess }: VotePanelProps) {
  const locale = useLocale()
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(7)
  const [loading, setLoading] = useState(false)

  const isResolved = market.status === 'resolved'
  const hasVoted = !!myVote
  const isBinary = (market.market_type || 'binary') === 'binary' && outcomes.length <= 2

  const handleVote = async () => {
    if (!selectedOutcomeId || loading || hasVoted || isResolved) return

    setLoading(true)
    try {
      const res = await fetch('/api/predictions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: market.id,
          outcome_id: selectedOutcomeId,
          confidence,
        }),
      })

      const data = await res.json()
      if (data.success) {
        onVoteSuccess?.(data.xp_earned)
        // Celebration stays open until user clicks Continue (no auto-reload)
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-2">Predictions closed</h3>
        <p className="text-slate-400 text-sm mb-4">
          This market has been resolved. Winning outcome: <span className="text-emerald-400 font-medium">{winningOutcome ? getOutcomeLabel(winningOutcome, locale) : (market.resolution ?? '—')}</span>
        </p>
        {myVote && (
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-slate-300 text-sm font-medium">Your prediction</p>
            <p className="text-white mt-1">
              {outcomes.find((o) => o.id === myVote.outcome_id) ? getOutcomeLabel(outcomes.find((o) => o.id === myVote.outcome_id)!, locale) : myVote.outcome_label} at confidence {myVote.confidence}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {myVote.is_correct ? (
                <span className="text-emerald-400">✓ Correct! +{myVote.xp_earned + (myVote.bonus_xp || 0)} XP total</span>
              ) : (
                <span className="text-slate-400">+{myVote.xp_earned} XP earned</span>
              )}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (hasVoted) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Your prediction</h3>
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <p className="text-emerald-400 font-medium flex items-center gap-2">
            <Check className="w-4 h-4" />
            {outcomes.find((o) => o.id === myVote!.outcome_id) ? getOutcomeLabel(outcomes.find((o) => o.id === myVote!.outcome_id)!, locale) : myVote!.outcome_label} at confidence {myVote!.confidence}
          </p>
          <p className="text-slate-300 text-sm mt-1">+{myVote!.xp_earned} XP earned</p>
        </div>
        <p className="text-slate-500 text-xs mt-3">One prediction per market</p>
      </div>
    )
  }

  if (outcomes.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-2">Make your prediction</h3>
        <p className="text-slate-400 text-sm">No outcomes available yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="font-semibold text-white mb-4">Make your prediction</h3>

      {isBinary ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {outcomes.map((o) => {
              const label = getOutcomeLabel(o, locale)
              const isYes = label.toLowerCase() === 'yes'
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
                      : 'bg-transparent border-2 border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                  }`}
                >
                  {isYes ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  I think {label.toUpperCase()}
                </button>
              )
            })}
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-300 font-medium mb-2 flex items-center gap-2">
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
                className="flex-1 h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleVote}
            disabled={!selectedOutcomeId || loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Submitting...' : 'Predict'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {outcomes.map((o) => {
            const isSelected = selectedOutcomeId === o.id
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
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{getOutcomeLabel(o, locale)}</p>
                    <p className="text-slate-400 text-sm">
                      {Math.round(toDisplayPercent(o.probability || 0))}% · {o.vote_count} votes
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {isSelected ? 'Selected' : 'Select'}
                  </span>
                </div>
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-slate-300 font-medium mb-2 flex items-center gap-2">
                      <span className="text-xl">{getConfidenceEmoji(confidence)}</span>
                      {getConfidenceLabel(confidence)} ({confidence}/10)
                    </p>
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={confidence}
                        onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVote() }}
                      disabled={loading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                    >
                      {loading ? 'Submitting...' : 'Submit prediction'}
                    </button>
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
