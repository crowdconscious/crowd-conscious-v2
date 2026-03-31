/** Allowed `prediction_markets.category` values (must match DB CHECK constraint). */
export const MARKET_CATEGORY_IDS = [
  'world_cup',
  'world',
  'pulse',
  'government',
  'geopolitics',
  'sustainability',
  'technology',
  'economy',
  'corporate',
  'community',
  'cause',
  'entertainment',
] as const

export type MarketCategoryId = (typeof MARKET_CATEGORY_IDS)[number]

const SET = new Set<string>(MARKET_CATEGORY_IDS)

export function isValidMarketCategory(id: string): id is MarketCategoryId {
  return SET.has(id)
}
