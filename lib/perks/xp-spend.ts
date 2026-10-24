import type { SupabaseClient } from '@supabase/supabase-js'
import type { LocationRedemptionRow } from './types'

export type SpendXpErrorCode =
  | 'unauthorized'
  | 'offer_not_found'
  | 'location_not_active'
  | 'offer_not_active'
  | 'offer_not_yet_valid'
  | 'offer_expired'
  | 'offer_out_of_stock'
  | 'tier_too_low'
  | 'insufficient_xp'
  | 'user_redemption_cap'
  | 'code_generation_failed'
  | 'unknown'

const RPC_ERROR_MAP: Record<string, SpendXpErrorCode> = {
  unauthorized: 'unauthorized',
  offer_not_found: 'offer_not_found',
  location_not_active: 'location_not_active',
  offer_not_active: 'offer_not_active',
  offer_not_yet_valid: 'offer_not_yet_valid',
  offer_expired: 'offer_expired',
  offer_out_of_stock: 'offer_out_of_stock',
  tier_too_low: 'tier_too_low',
  insufficient_xp: 'insufficient_xp',
  user_redemption_cap: 'user_redemption_cap',
  code_generation_failed: 'code_generation_failed',
}

export function parseSpendXpError(message: string | undefined): SpendXpErrorCode {
  if (!message) return 'unknown'
  for (const [key, code] of Object.entries(RPC_ERROR_MAP)) {
    if (message.includes(key)) return code
  }
  return 'unknown'
}

/** Atomic spend via Postgres RPC (migration 244). */
export async function spendXpForRedemption(
  supabase: SupabaseClient,
  userId: string,
  offerId: string
): Promise<LocationRedemptionRow> {
  const { data, error } = await supabase.rpc('spend_xp_for_perk_redemption', {
    p_user_id: userId,
    p_offer_id: offerId,
  })

  if (error) {
    throw Object.assign(new Error(error.message), {
      code: parseSpendXpError(error.message),
    })
  }

  return data as LocationRedemptionRow
}
