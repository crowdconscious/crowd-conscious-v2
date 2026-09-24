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
import { resolveOutcomeAvgConfidence, type PulseVoteAggregates } from '@/lib/pulse-vote-aggregates'
import { trackUxEvent } from '@/lib/ux-overhaul-analytics'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

type Outcome = {
  id: string
  label: string
  subtitle?: string | null
  probability: number
  vote_count: number
  total_confidence: number
  confident_pick_count?: number | null
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
    selections?: { outcome_id: string; confidence: number }[] | null
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

function revealSessionKey(marketId: string) {
  return `cc_post_vote_reveal_${marketId}`
}

/**
 * Inline vote + Phase 1 reveal for shared /pulse/[id] links.
 * Options are tappable immediately; sponsor chrome stays below in the parent.
 *
 * Guest + registered vote success ALWAYS opens PostVoteScreen. We defer
 * router.refresh() until the reveal closes so a soft remount cannot wipe
 * celebration.open and drop the user onto the raw results grid (density
 * honesty / §3.3 low-n first-voice copy).
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
    /** Votes to feed the reveal; snapshotted at success so refresh cannot race. */
    voteN?: number
  }>({ open: false })
  const [pendingRefresh, setPendingRefresh] = useState(false)

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

  // Survive soft remounts (refresh / parent re-render): reopen the reveal once.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem(revealSessionKey(market.id))
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        outcomeId?: string
        guest?: boolean
        voteN?: number
      }
      if (!parsed.outcomeId) return
      setCelebration({
        open: true,
        guest: parsed.guest === true,
        outcomeId: parsed.outcomeId,
        voteN: typeof parsed.voteN === 'number' ? parsed.voteN : undefined,
      })
    } catch {
      // ignore corrupt session payload
    }
  }, [market.id])

  const hasVoted = isAuthenticated ? !!myVote : !!guestVoteRecord

  const allOutcomes: PostVoteOutcomeStat[] = useMemo(
    () =>
      outcomes.map((o) => ({
        outcomeId: o.id,
        label: getOutcomeLabel(o, locale),
        subtitle: getOutcomeSubtitle(o, locale),
        probability: Number(o.probability ?? 0),
        avgConfidence: resolveOutcomeAvgConfidence({
          totalConfidence: o.total_confidence,
          confidentPickCount: o.confident_pick_count,
          stats: aggregates.byOutcome[o.id],
        }),
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

  const persistReveal = useCallback(
    (payload: { outcomeId?: string; guest: boolean; voteN: number }) => {
      if (!payload.outcomeId || typeof window === 'undefined') return
      try {
        sessionStorage.setItem(
          revealSessionKey(market.id),
          JSON.stringify({
            outcomeId: payload.outcomeId,
            guest: payload.guest,
            voteN: payload.voteN,
          })
        )
      } catch {
        // sessionStorage may be unavailable; in-memory celebration still works
      }
    },
    [market.id]
  )

  const clearRevealSession = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.removeItem(revealSessionKey(market.id))
    } catch {
      // ignore
    }
  }, [market.id])

  const openReveal = useCallback(
    (opts: { outcomeId?: string; guest: boolean }) => {
      // Include this ballot in the density check even before server refresh.
      const voteN = Math.max(aggregates.totalVotes + 1, 1)
      setCelebration({
        open: true,
        guest: opts.guest,
        outcomeId: opts.outcomeId,
        voteN,
      })
      persistReveal({
        outcomeId: opts.outcomeId,
        guest: opts.guest,
        voteN,
      })
      trackUxEvent('action_completed', {
        surface: 'web',
        action_type: 'vote',
        object_id: market.id,
      })
      onVoted?.()
      // Defer refresh until close — refreshing while open can remount this
      // tree and drop celebration.open before the user sees first-voice copy.
      setPendingRefresh(true)
    },
    [aggregates.totalVotes, market.id, onVoted, persistReveal]
  )

  const handleVoteSuccess = useCallback(
    (payload: { outcomeId?: string }) => {
      openReveal({ outcomeId: payload.outcomeId, guest: false })
    },
    [openReveal]
  )

  const handleAnonymousVoteSuccess = useCallback(
    (payload: GuestVotePayload) => {
      // Never skip the reveal for guests. Resolve guest id if state raced.
      const gid = guestId || getOrCreateGuestId()
      if (gid && !guestId) setGuestId(gid)
      if (gid) {
        setMarketGuestVote(market.id, gid, payload)
      }
      setGuestVoteRecord(payload)
      openReveal({ outcomeId: payload.outcomeId, guest: true })
    },
    [guestId, market.id, openReveal]
  )

  const handleClose = useCallback(() => {
    clearRevealSession()
    setCelebration((c) => ({ ...c, open: false }))
    if (pendingRefresh) {
      setPendingRefresh(false)
      router.refresh()
    }
  }, [clearRevealSession, pendingRefresh, router])

  // Already voted and reveal dismissed: parent shows density-honest results.
  if (hasVoted && !celebration.open) {
    return null
  }

  const revealVoteN =
    celebration.voteN ??
    aggregates.totalVotes + (celebration.open ? 1 : 0)

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
        totalVotes={revealVoteN}
        sponsorName={market.sponsor_name}
        allOutcomes={allOutcomes}
        otherReasons={otherReasons}
        onClose={handleClose}
      />
    </div>
  )
}
