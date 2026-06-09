/**
 * Tiered creator-sponsorship model (migrations 237–239).
 *
 * Three constrained tiers — no advertorial. Each creator sets their own price
 * per tier within platform-wide guardrails (`sponsorship_tier_limits`); a sponsor
 * may add an optional top-up at checkout. Tiers set PRICE + PLACEMENT only — they
 * never change the revenue split (the Conscious Fund is always a flat 20% of
 * gross; see `lib/fund-allocation.ts`).
 *
 * This module is the single source of truth that the sponsor checkout UI, the
 * checkout route, the creator pricing settings, and the card renderer all build
 * on. It contains NO database access and NO money writes.
 */

import { CONSCIOUS_FUND_PERCENT } from '@/lib/fund-allocation'

export const SPONSORSHIP_TIERS = ['support', 'sponsor', 'featured'] as const
export type SponsorshipTier = (typeof SPONSORSHIP_TIERS)[number]

export function isSponsorshipTier(value: unknown): value is SponsorshipTier {
  return value === 'support' || value === 'sponsor' || value === 'featured'
}

/** Platform-wide guardrail for one tier (`sponsorship_tier_limits` row). */
export type TierLimit = {
  tier: SponsorshipTier
  minPrice: number
  maxPrice: number
  defaultPrice: number
  currency: string
}

/** A creator's configured price for one tier (`creator_sponsorship_tiers` row). */
export type CreatorTierPrice = {
  tier: SponsorshipTier
  price: number
  currency: string
  enabled: boolean
}

/** Round to 2 decimals (currency). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * The Conscious-Fund peso preview for a gross amount: a flat 20% of gross
 * (tier price + top-up). Used for the live "$X al Fondo Consciente" copy and as
 * the snapshot reference; the webhook recomputes the authoritative split.
 */
export function fundPreview(gross: number): number {
  return round2(gross * CONSCIOUS_FUND_PERCENT)
}

export type ResolvedTierPrice = {
  tier: SponsorshipTier
  price: number
  currency: string
  /** Whether the price came from the creator's own row or the platform default. */
  source: 'creator' | 'platform'
}

/**
 * Effective price a sponsor pays for a tier.
 *
 * Fallback rule (schema contract): a creator with no row for a tier — or one
 * with `enabled = false` — is not offering a custom price, so the UI falls back
 * to the platform `default_price` from `sponsorship_tier_limits`.
 */
export function resolveTierPrice(
  tier: SponsorshipTier,
  creatorRows: CreatorTierPrice[],
  limit: TierLimit
): ResolvedTierPrice {
  const own = creatorRows.find((r) => r.tier === tier && r.enabled)
  if (own) {
    return { tier, price: own.price, currency: own.currency, source: 'creator' }
  }
  return {
    tier,
    price: limit.defaultPrice,
    currency: limit.currency,
    source: 'platform',
  }
}

export type PriceValidation =
  | { ok: true; price: number }
  | { ok: false; reason: 'below_min' | 'above_max' | 'not_finite' }

/**
 * Validate a creator-set tier price against the platform `[min, max]` guardrail.
 * App-level enforcement is primary (migration 238 ships an OPTIONAL DB trigger).
 */
export function validateCreatorPrice(
  price: number,
  limit: TierLimit
): PriceValidation {
  if (!Number.isFinite(price)) return { ok: false, reason: 'not_finite' }
  const rounded = round2(price)
  if (rounded < limit.minPrice) return { ok: false, reason: 'below_min' }
  if (rounded > limit.maxPrice) return { ok: false, reason: 'above_max' }
  return { ok: true, price: rounded }
}

/**
 * Placement plan a tier resolves to on the sponsored surface. The card renderer
 * keys off `creator_sponsorships.tier`:
 *   - support  → moderated shout-out only, NO logo placement.
 *   - sponsor  → one constrained sponsor card.
 *   - featured → two constrained sponsor cards + a "Con el apoyo de" byline.
 *   - null     → legacy / non-tiered row: keep the historical two-slot card.
 */
export type SponsorSlotPlan = {
  inlineCard: boolean
  footerCard: boolean
  shoutout: boolean
  byline: boolean
}

export function sponsorSlotPlan(tier: SponsorshipTier | null): SponsorSlotPlan {
  switch (tier) {
    case 'support':
      return { inlineCard: false, footerCard: false, shoutout: true, byline: false }
    case 'sponsor':
      return { inlineCard: false, footerCard: true, shoutout: false, byline: false }
    case 'featured':
      return { inlineCard: true, footerCard: true, shoutout: false, byline: true }
    default:
      // Legacy / non-tiered rows keep the historical inline + footer placement.
      return { inlineCard: true, footerCard: true, shoutout: false, byline: false }
  }
}
