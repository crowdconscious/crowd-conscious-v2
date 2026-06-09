/**
 * Money-engine helpers for creator-market sponsorships (Prompt 3).
 *
 * This module owns the *resolution* logic that the Stripe webhook uses to turn
 * a paid Checkout Session into snapshotted ledger rows:
 *
 *   - which `revenue_split_configs` row applies (creator / platform / editorial /
 *     pulse_signal),
 *   - the `sourced_by` value,
 *   - the attributed creator (for payout accrual),
 *   - and the per-period payout bucket.
 *
 * All money WRITES are service-role only. We deliberately use the *untyped*
 * admin client (`createAdminClient`) here because the new creator-market tables
 * (`creator_sponsorships`, `revenue_split_configs`,
 * `conscious_fund_contributions`, `influencer_payouts`, `signal_sponsorships`)
 * are not yet modelled in `types/database.ts`. The typed `getSupabase()` helper
 * would reject `.from('creator_sponsorships')`. Keeping this island untyped is
 * additive and avoids editing the generated types file.
 */

import { createAdminClient } from '@/lib/supabase-admin'

/** Service-role client for the new (un-modelled) money tables. */
export function getMoneyClient() {
  return createAdminClient()
}

export const SPONSORSHIP_KIND = 'sponsorship'

export type SurfaceType = 'blog' | 'signal' | 'pulse'
export type SplitLabel =
  | 'creator_sourced'
  | 'platform_sourced'
  | 'editorial'
  | 'pulse_signal'
/** creator_sponsorships.sourced_by CHECK ∈ {creator, platform, editorial}. */
export type SourcedBy = 'creator' | 'platform' | 'editorial'

export function isSurfaceType(value: unknown): value is SurfaceType {
  return value === 'blog' || value === 'signal' || value === 'pulse'
}

export type SplitConfig = {
  label: SplitLabel
  fund_pct: number
  creator_pct: number
  platform_pct: number
}

/**
 * Resolve which named split applies, per the locked contract:
 *   - surface_type 'pulse' | 'signal'        → pulse_signal (20 / 0 / 80)
 *   - blog + metadata.creator_id present     → creator_sourced (20 / 60 / 20)
 *   - blog, no creator_id, has post author   → platform_sourced (20 / 20 / 60)
 *   - blog, no creator_id, no author         → editorial (20 / 0 / 80)
 *
 * `hasCreatorAuthor` is only consulted for blog surfaces with no explicit
 * creator_id in the checkout metadata.
 */
export function resolveSplitLabel(params: {
  surfaceType: SurfaceType
  creatorIdFromMetadata: string | null
  hasCreatorAuthor: boolean
}): { label: SplitLabel; sourcedBy: SourcedBy } {
  const { surfaceType, creatorIdFromMetadata, hasCreatorAuthor } = params

  if (surfaceType === 'pulse' || surfaceType === 'signal') {
    // pulse_signal has no `sourced_by` value of its own; it is editorial-style
    // (creator 0%). sourced_by therefore records 'editorial'.
    return { label: 'pulse_signal', sourcedBy: 'editorial' }
  }

  // blog
  if (creatorIdFromMetadata) {
    return { label: 'creator_sourced', sourcedBy: 'creator' }
  }
  if (hasCreatorAuthor) {
    return { label: 'platform_sourced', sourcedBy: 'platform' }
  }
  return { label: 'editorial', sourcedBy: 'editorial' }
}

/**
 * Load the snapshot percentages for a label from `revenue_split_configs`. The
 * config is the single source of truth (so an admin edit changes future
 * sponsorships) and we snapshot the result onto the sponsorship row so history
 * never rewrites.
 *
 * Falls back to the contract's hard-coded percentages only if the config row is
 * somehow missing (the migration seeds all four labels, so this is defensive).
 */
export async function loadSplitConfig(label: SplitLabel): Promise<SplitConfig> {
  const supabase = getMoneyClient()
  const { data, error } = await supabase
    .from('revenue_split_configs')
    .select('label, fund_pct, creator_pct, platform_pct')
    .eq('label', label)
    .maybeSingle()

  if (error) {
    console.error('[sponsorship] revenue_split_configs read failed', error)
  }

  if (data) {
    return {
      label,
      fund_pct: Number(data.fund_pct),
      creator_pct: Number(data.creator_pct),
      platform_pct: Number(data.platform_pct),
    }
  }

  // Defensive fallback to the contract defaults.
  const fallback: Record<SplitLabel, [number, number, number]> = {
    creator_sourced: [20, 60, 20],
    platform_sourced: [20, 20, 60],
    editorial: [20, 0, 80],
    pulse_signal: [20, 0, 80],
  }
  const [fund_pct, creator_pct, platform_pct] = fallback[label]
  return { label, fund_pct, creator_pct, platform_pct }
}

/** Round to 2 decimals (currency). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export type SplitAmounts = {
  gross: number
  fundAmount: number
  creatorAmount: number
  platformAmount: number
}

/** Compute snapshotted amounts from gross + a split config. */
export function computeAmounts(gross: number, config: SplitConfig): SplitAmounts {
  const fundAmount = round2((gross * config.fund_pct) / 100)
  const creatorAmount = round2((gross * config.creator_pct) / 100)
  // Platform takes the remainder so the three always sum to gross exactly
  // despite rounding.
  const platformAmount = round2(gross - fundAmount - creatorAmount)
  return { gross, fundAmount, creatorAmount, platformAmount }
}

/** Current payout period bucket, e.g. '2026-06' (UTC month). */
export function currentPayoutPeriod(date = new Date()): string {
  return date.toISOString().slice(0, 7)
}
