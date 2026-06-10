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
 */

export type PulseVoteLike = {
  confidence: number | null
  outcome_id: string
  created_at: string
}

export type PulseOutcomeVoteStats = {
  /** All votes for the outcome, valid confidence or not. */
  count: number
  /** Sum over votes with confidence in 1..10. */
  confidenceSum: number
  /** Number of votes with confidence in 1..10. */
  confidenceCount: number
}

/** `hour` is an ISO prefix 'YYYY-MM-DDTHH' (UTC). */
export type PulseTimelineBucket = { hour: string; count: number }

export type PulseVoteAggregates = {
  totalVotes: number
  /** Index 0 = confidence 1 … index 9 = confidence 10. */
  confidenceHistogram: number[]
  byOutcome: Record<string, PulseOutcomeVoteStats>
  timeline: PulseTimelineBucket[]
}

function isValidConfidence(c: number | null): c is number {
  return typeof c === 'number' && c >= 1 && c <= 10
}

export function aggregatePulseVotes(votes: PulseVoteLike[]): PulseVoteAggregates {
  const confidenceHistogram = Array.from({ length: 10 }, () => 0)
  const byOutcome: Record<string, PulseOutcomeVoteStats> = {}
  const timelineMap = new Map<string, number>()

  for (const v of votes) {
    const stats = (byOutcome[v.outcome_id] ??= {
      count: 0,
      confidenceSum: 0,
      confidenceCount: 0,
    })
    stats.count++

    if (isValidConfidence(v.confidence)) {
      confidenceHistogram[Math.round(v.confidence) - 1]++
      stats.confidenceSum += v.confidence
      stats.confidenceCount++
    }

    const hour = new Date(v.created_at).toISOString().slice(0, 13)
    timelineMap.set(hour, (timelineMap.get(hour) ?? 0) + 1)
  }

  const timeline = [...timelineMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([hour, count]) => ({ hour, count }))

  return {
    totalVotes: votes.length,
    confidenceHistogram,
    byOutcome,
    timeline,
  }
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
