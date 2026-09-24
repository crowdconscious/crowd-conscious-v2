import { groupOtherTexts, parseRankings } from './pulse-vote-ranking'
import type { VoteSelection } from './multi-select-pulses'

/**
 * Server-side vote aggregation for the public /pulse/[id] surface.
 *
 * Before this module the page serialized every market_votes row — including
 * each voter's user_id — into the client payload, which leaked voter
 * identities and grew unbounded with votes (privacy + Core Web Vitals risk
 * on the most-shared URL). Public viewers now receive only these bounded
 * aggregates; full vote rows are still passed to authorized analytics
 * viewers (admin / sponsor token) who need CSV export and live updates.
 *
 * Pure functions, no 'use client': used by the server page to build the
 * payload and by the client to recompute aggregates from realtime vote
 * inserts in the enhanced view.
 *
 * Multi-select (vote_mode=multi): pass `selections` on each vote. Each pick
 * increments that outcome's people-count and contributes its own certainty
 * (0 excluded from averages). `totalVotes` remains number of people (rows).
 * Headline "% who chose it" = count / totalVotes (does NOT sum to 100).
 */

export type PulsePreferenceStats = {
  rank2Count: number
  rank3Count: number
}

export type PulseOtherTextGroup = {
  text: string
  count: number
}

export type PulseVoteLike = {
  confidence: number | null
  outcome_id: string
  created_at: string
  /** Ranked mode jsonb; ignored for rank-1 bars (those use outcome_id). */
  rankings?: unknown
  other_text?: string | null
  /**
   * Multi mode: [{outcome_id, confidence}]. When present and non-empty,
   * aggregates per-option people + certainty from these picks instead of
   * the primary outcome_id alone.
   */
  selections?: VoteSelection[] | null
}

export type PulseOutcomeVoteStats = {
  /** People who picked this outcome (multi: any pick; single: primary). */
  count: number
  /** Sum over picks with confidence in 1..10. */
  confidenceSum: number
  /** Number of picks with confidence in 1..10. */
  confidenceCount: number
}

/** `hour` is an ISO prefix 'YYYY-MM-DDTHH' (UTC). */
export type PulseTimelineBucket = { hour: string; count: number }

export type PulseVoteAggregates = {
  /** Number of voters (people), not picks. */
  totalVotes: number
  /** Index 0 = confidence 1 … index 9 = confidence 10. Multi: one entry per pick. */
  confidenceHistogram: number[]
  byOutcome: Record<string, PulseOutcomeVoteStats>
  timeline: PulseTimelineBucket[]
  /** Rank 2/3 mention counts — preference signal, not confidence weight. */
  preferenceByOutcome: Record<string, PulsePreferenceStats>
  otherTextGroups: PulseOtherTextGroup[]
}

function isValidConfidence(c: number | null): c is number {
  return typeof c === 'number' && c >= 1 && c <= 10
}

function bumpOutcome(
  byOutcome: Record<string, PulseOutcomeVoteStats>,
  outcomeId: string,
  confidence: number | null,
  histogram: number[]
) {
  const stats = (byOutcome[outcomeId] ??= {
    count: 0,
    confidenceSum: 0,
    confidenceCount: 0,
  })
  stats.count++
  if (isValidConfidence(confidence)) {
    histogram[Math.round(confidence) - 1]++
    stats.confidenceSum += confidence
    stats.confidenceCount++
  }
}

export function aggregatePulseVotes(votes: PulseVoteLike[]): PulseVoteAggregates {
  const confidenceHistogram = Array.from({ length: 10 }, () => 0)
  const byOutcome: Record<string, PulseOutcomeVoteStats> = {}
  const preferenceByOutcome: Record<string, PulsePreferenceStats> = {}
  const timelineMap = new Map<string, number>()
  const otherTexts: Array<string | null | undefined> = []

  for (const v of votes) {
    const sels =
      Array.isArray(v.selections) && v.selections.length > 0 ? v.selections : null

    if (sels) {
      for (const s of sels) {
        bumpOutcome(byOutcome, s.outcome_id, s.confidence, confidenceHistogram)
      }
    } else {
      bumpOutcome(byOutcome, v.outcome_id, v.confidence, confidenceHistogram)
    }

    const hour = new Date(v.created_at).toISOString().slice(0, 13)
    timelineMap.set(hour, (timelineMap.get(hour) ?? 0) + 1)

    const rankings = parseRankings(v.rankings)
    if (rankings) {
      for (const r of rankings) {
        if (r.rank !== 2 && r.rank !== 3) continue
        const pref = (preferenceByOutcome[r.outcome_id] ??= { rank2Count: 0, rank3Count: 0 })
        if (r.rank === 2) pref.rank2Count++
        else pref.rank3Count++
      }
    }

    otherTexts.push(v.other_text)
  }

  const timeline = [...timelineMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([hour, count]) => ({ hour, count }))

  return {
    totalVotes: votes.length,
    confidenceHistogram,
    byOutcome,
    timeline,
    preferenceByOutcome,
    otherTextGroups: groupOtherTexts(otherTexts),
  }
}

/**
 * Share of people who chose an option (multi headline). Does NOT sum to 1.
 * Returns null when there are no voters yet.
 */
export function outcomeChooserShare(
  stats: PulseOutcomeVoteStats | undefined,
  totalVoters: number
): number | null {
  if (totalVoters <= 0 || !stats) return null
  return stats.count / totalVoters
}

/** Sum of histogram counts (votes with a valid 1..10 confidence). */
export function histogramValidCount(histogram: number[]): number {
  return histogram.reduce((sum, n) => sum + n, 0)
}

/** Sum of confidence values represented by the histogram. */
export function histogramConfidenceSum(histogram: number[]): number {
  return histogram.reduce((sum, n, i) => sum + n * (i + 1), 0)
}

/** Votes with confidence >= min (1-based confidence level). */
export function histogramCountAtLeast(histogram: number[], min: number): number {
  return histogram.reduce((sum, n, i) => (i + 1 >= min ? sum + n : sum), 0)
}

/** Votes with confidence <= max (1-based confidence level). */
export function histogramCountAtMost(histogram: number[], max: number): number {
  return histogram.reduce((sum, n, i) => (i + 1 <= max ? sum + n : sum), 0)
}

/** Average of valid confidences for one outcome, or null when none. */
export function outcomeAvgConfidence(
  stats: PulseOutcomeVoteStats | undefined
): number | null {
  if (!stats || stats.confidenceCount === 0) return null
  return stats.confidenceSum / stats.confidenceCount
}

/**
 * Canonical public avg certainty from maintained outcome columns
 * (same formula mobile must use after mig 262):
 *   total_confidence / confident_pick_count
 * where confident_pick_count excludes confidence 0 ("No lo sé").
 */
export function outcomeAvgConfidenceFromTotals(
  totalConfidence: number | null | undefined,
  confidentPickCount: number | null | undefined
): number | null {
  const sum = typeof totalConfidence === 'number' ? totalConfidence : 0
  const n = typeof confidentPickCount === 'number' ? confidentPickCount : 0
  if (n <= 0) return null
  return sum / n
}

/**
 * Prefer DB-maintained totals when present so web matches mobile
 * (`get_pulse_outcome_aggregates` / outcome columns); fall back to
 * row-aggregated stats.
 */
export function resolveOutcomeAvgConfidence(args: {
  totalConfidence?: number | null
  confidentPickCount?: number | null
  stats?: PulseOutcomeVoteStats
}): number | null {
  if (
    typeof args.confidentPickCount === 'number' &&
    args.confidentPickCount > 0 &&
    typeof args.totalConfidence === 'number'
  ) {
    return outcomeAvgConfidenceFromTotals(args.totalConfidence, args.confidentPickCount)
  }
  return outcomeAvgConfidence(args.stats)
}
