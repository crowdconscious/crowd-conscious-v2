/**
 * Engagement thresholds used to gate UI on public surfaces.
 *
 * Markets with very few votes show misleading 0%/100% bars and act as
 * anti-social-proof on the landing page and feed. Below the threshold we
 * either hide the market entirely (landing) or replace the bars with a
 * "be one of the first voices" treatment (cards, feed).
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
