/**
 * Server-side readers for the tier tables (migrations 237 + 238).
 *
 * `sponsorship_tier_limits` and `creator_sponsorship_tiers` are both PUBLIC-read
 * (anon + authenticated), so any client — admin, session, or anon — can read
 * them. These helpers accept whichever Supabase client the caller already has.
 *
 * The new tier tables are not modelled in `types/database.ts`, so callers pass
 * an untyped client (the admin / server clients are created without the
 * `Database` generic, which keeps `.from('sponsorship_tier_limits')` valid).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SPONSORSHIP_TIERS,
  isSponsorshipTier,
  type CreatorTierPrice,
  type SponsorshipTier,
  type TierLimit,
} from '@/lib/sponsorship-tiers'

export type TierLimitsMap = Record<SponsorshipTier, TierLimit>

/** Contract launch defaults — used only if a limits row is somehow missing. */
const FALLBACK_LIMITS: TierLimitsMap = {
  support: { tier: 'support', minPrice: 50, maxPrice: 1000, defaultPrice: 150, currency: 'MXN' },
  sponsor: { tier: 'sponsor', minPrice: 750, maxPrice: 5000, defaultPrice: 1500, currency: 'MXN' },
  featured: { tier: 'featured', minPrice: 2000, maxPrice: 12000, defaultPrice: 4000, currency: 'MXN' },
}

/** Load the platform guardrails for every tier, with defensive fallbacks. */
export async function loadTierLimits(
  supabase: SupabaseClient
): Promise<TierLimitsMap> {
  const { data, error } = await supabase
    .from('sponsorship_tier_limits')
    .select('tier, min_price, max_price, default_price, currency')

  if (error) {
    console.error('[sponsorship-tiers] sponsorship_tier_limits read failed', error)
    return { ...FALLBACK_LIMITS }
  }

  const map: TierLimitsMap = { ...FALLBACK_LIMITS }
  for (const row of data ?? []) {
    if (!isSponsorshipTier(row.tier)) continue
    map[row.tier] = {
      tier: row.tier,
      minPrice: Number(row.min_price),
      maxPrice: Number(row.max_price),
      defaultPrice: Number(row.default_price),
      currency: (row.currency as string | null) ?? 'MXN',
    }
  }
  return map
}

/** Load a single creator's configured tier prices (may be empty). */
export async function loadCreatorTiers(
  supabase: SupabaseClient,
  creatorId: string
): Promise<CreatorTierPrice[]> {
  const { data, error } = await supabase
    .from('creator_sponsorship_tiers')
    .select('tier, price, currency, enabled')
    .eq('creator_id', creatorId)

  if (error) {
    console.error('[sponsorship-tiers] creator_sponsorship_tiers read failed', error)
    return []
  }

  return (data ?? [])
    .filter((row) => isSponsorshipTier(row.tier))
    .map((row) => ({
      tier: row.tier as SponsorshipTier,
      price: Number(row.price),
      currency: (row.currency as string | null) ?? 'MXN',
      enabled: Boolean(row.enabled),
    }))
}

export { SPONSORSHIP_TIERS }
