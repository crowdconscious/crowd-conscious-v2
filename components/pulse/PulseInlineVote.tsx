'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'
import {
  VotePanel,
  type GuestVotePayload,
} from '@/app/(predictions)/predictions/components/VotePanel'
import PostVoteScreen, {
  type PostVoteOutcomeStat,
  type PostVoteReason,
} from '@/components/pulse/PostVoteScreen'
import {
  getOrCreateGuestId,
  getVotedGuestIdForMarket,
  getGuestVoteDetail,
  setMarketGuestVote,
} from '@/lib/guest-vote-storage'
import {
  getOutcomeLabel,
  getOutcomeSubtitle,
} from '@/lib/i18n/market-translations'
import { outcomeAvgConfidence, type PulseVoteAggregates } from '@/lib/pulse-vote-aggregates'
import { trackUxEvent } from '@/lib/ux-overhaul-analytics'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

type Outcome = {
  id: string
  label: string
  subtitle?: string | null
  probability: number
  vote_count: number
  total_confidence: number
  is_winner: boolean | null
  translations?: Record<string, { label?: string; subtitle?: string }> | null
  is_other?: boolean | null
  sort_order?: number | null
}

type Props = {
  market: PredictionMarket
  outcomes: Outcome[]
  locale: 'es' | 'en'
  isAuthenticated: boolean
  myVote: {
    outcome_id: string
    outcome_label: string
    confidence: number
    xp_earned: number
    is_correct: boolean | null
    bonus_xp: number
    rankings?: { outcome_id: string; rank: number }[] | null
    other_text?: string | null
  } | null
  aggregates: PulseVoteAggregates
  featuredReasonings: Array<{
    id: string
    reasoning: string
    confidence: number
    outcome_id: string
  }>
  onVoted?: () => void
}

/**
 * Inline vote + Phase 1 reveal for shared /pulse/[id] links.
 * Options are tappable immediately; sponsor chrome stays below in the parent.
 */
export default function PulseInlineVote({
  market,
  outcomes,
  locale,
  isAuthenticated,
  myVote,
  aggregates,
  featuredReasonings,
  onVoted,
}: Props) {
  const router = useRouter()
  const [guestId, setGuestId] = useState('')
  const [guestVoteRecord, setGuestVoteRecord] = useState<GuestVotePayload | null>(null)
  const [celebration, setCelebration] = useState<{
    open: boolean
    guest?: boolean
    outcomeId?: string
  }>({ open: false })

  useEffect(() => {
    if (isAuthenticated) {
      setGuestId('')
      setGuestVoteRecord(null)
      return
    }
    const gid = getOrCreateGuestId()
    setGuestId(gid)
    const voted = getVotedGuestIdForMarket(market.id)
    if (gid && voted === gid) {
      setGuestVoteRecord(getGuestVoteDetail(market.id))
    }
  }, [market.id, isAuthenticated])

  const hasVoted = isAuthenticated ? !!myVote : !!guestVoteRecord

  const allOutcomes: PostVoteOutcomeStat[] = useMemo(
    () =>
      outcomes.map((o) => ({
        outcomeId: o.id,
        label: getOutcomeLabel(o, locale),
        subtitle: getOutcomeSubtitle(o, locale),
        probability: Number(o.probability ?? 0),
        avgConfidence: outcomeAvgConfidence(aggregates.byOutcome[o.id]),
      })),
    [outcomes, locale, aggregates]
  )

  const votedOutcome: PostVoteOutcomeStat | null = celebration.outcomeId
    ? allOutcomes.find((o) => o.outcomeId === celebration.outcomeId) ?? null
    : null

  const otherReasons: PostVoteReason[] = useMemo(() => {
    if (!celebration.outcomeId) return []
    return featuredReasonings
      .filter((r) => r.outcome_id !== celebration.outcomeId && r.confidence >= 1)
      .map((r) => ({
        id: r.id,
        reasoning: r.reasoning,
        confidence: r.confidence,
        outcome_id: r.outcome_id,
        alcaldia: locale === 'es' ? 'CDMX' : 'Mexico City',
      }))
  }, [featuredReasonings, celebration.outcomeId, locale])

  const handleVoteSuccess = useCallback(
    (payload: { outcomeId?: string }) => {
      setCelebration({
        open: true,
        guest: false,
        outcomeId: payload.outcomeId,
      })
      trackUxEvent('action_completed', {
        surface: 'web',
        action_type: 'vote',
        object_id: market.id,
      })
      onVoted?.()
      router.refresh()
    },
    [market.id, onVoted, router]
  )

  const handleAnonymousVoteSuccess = useCallback(
    (payload: GuestVotePayload) => {
      if (!guestId) return
      setMarketGuestVote(market.id, guestId, payload)
      setGuestVoteRecord(payload)
      setCelebration({
        open: true,
        guest: true,
        outcomeId: payload.outcomeId,
      })
      trackUxEvent('action_completed', {
        surface: 'web',
        action_type: 'vote',
        object_id: market.id,
      })
      onVoted?.()
      router.refresh()
    },
    [guestId, market.id, onVoted, router]
  )

  // Already voted: parent PulseResultClient shows results. Skip panel.
  if (hasVoted && !celebration.open) {
    return null
  }

  return (
    <div id="vote" className="mt-6">
      {!hasVoted ? (
        <VotePanel
          market={market}
          outcomes={outcomes}
          myVote={myVote}
          isAuthenticated={isAuthenticated}
          guestId={guestId || null}
          guestVoteRecord={guestVoteRecord}
          onVoteSuccess={handleVoteSuccess}
          onAnonymousVoteSuccess={handleAnonymousVoteSuccess}
        />
      ) : null}

      <PostVoteScreen
        isOpen={celebration.open}
        marketId={market.id}
        marketTitle={market.title}
        votedOutcome={votedOutcome}
        userType={celebration.guest ? 'guest' : 'registered'}
        locale={locale}
        totalVotes={aggregates.totalVotes + (celebration.open ? 1 : 0)}
        sponsorName={market.sponsor_name}
        allOutcomes={allOutcomes}
        otherReasons={otherReasons}
        onClose={() => setCelebration((c) => ({ ...c, open: false }))}
      />
    </div>
  )
}
