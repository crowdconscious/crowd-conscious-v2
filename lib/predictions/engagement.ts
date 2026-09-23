/**
 * Engagement thresholds used to gate probability UI on public surfaces.
 *
 * Markets with very few votes show misleading 0%/100% bars. Below the
 * threshold, cards and feed replace bars with a "be one of the first
 * voices" treatment — discovery surfaces must not hide open markets
 * solely for low vote counts.
 */

/** Minimum votes a market needs before its outcome probabilities are
 *  trustworthy enough to display on public surfaces. */
export const PUBLIC_MARKET_MIN_VOTES = 5

/** Returns the vote total for a market, treating null/undefined as 0. */
export function marketVoteCount(market: {
  total_votes?: number | null
  engagement_count?: number | null
}): number {
  const total = Number(market.total_votes ?? 0)
  const engagement = Number(market.engagement_count ?? 0)
  return Math.max(total, engagement)
}

/** True when a market should render the "first voices" treatment instead
 *  of probability bars (i.e., when public credibility hasn't been earned). */
export function isLowEngagementMarket(market: {
  total_votes?: number | null
  engagement_count?: number | null
}): boolean {
  return marketVoteCount(market) < PUBLIC_MARKET_MIN_VOTES
}
