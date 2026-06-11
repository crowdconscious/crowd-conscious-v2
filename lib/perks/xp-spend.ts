import type { SupabaseClient } from '@supabase/supabase-js'
import { getTierByXP } from '@/lib/tier-config'
import type { LocationRedemptionRow } from './types'

export type SpendableBalance = {
  total_xp: number
  total_xp_spent: number
  spendable: number
  tier: number
}

export async function getSpendableBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<SpendableBalance> {
  const { data, error } = await supabase
    .from('user_xp')
    .select('total_xp, total_xp_spent')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  const totalXp = data?.total_xp ?? 0
  const totalSpent = (data as { total_xp_spent?: number } | null)?.total_xp_spent ?? 0
  const spendable = Math.max(0, totalXp - totalSpent)

  return {
    total_xp: totalXp,
    total_xp_spent: totalSpent,
    spendable,
    tier: getTierByXP(totalXp).id,
  }
}

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
