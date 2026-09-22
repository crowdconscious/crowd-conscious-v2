/**
 * Neighbour-participated reputation award.
 *
 * Spec §3.6 allows awarding when a neighbour you invited then participates.
 * Attribution beyond `app_referral_clicks` (click log only) is not wired yet —
 * call this from the first civic action of a referred user once that chain exists.
 *
 * Never award for opinion-vote volume/option/confidence of the neighbour.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { awardCivicReputation } from '@/lib/reputation/award'
import type { CivicReputationDomain } from '@/lib/reputation/domains'

export async function awardReputationForNeighbourParticipated(
  admin: SupabaseClient,
  params: {
    referrerUserId: string
    neighbourUserId: string
    domain: CivicReputationDomain
    alcaldia: string
    /** Stable id for idempotency — e.g. neighbour user id or referral row id. */
    attributionObjectId: string
  }
) {
  if (params.referrerUserId === params.neighbourUserId) {
    return { success: false as const, error: 'skip_self' }
  }

  return awardCivicReputation(admin, {
    userId: params.referrerUserId,
    domain: params.domain,
    alcaldia: params.alcaldia,
    reason: 'neighbour_participated',
    objectType: 'referral',
    objectId: params.attributionObjectId,
    meta: { neighbour_user_id: params.neighbourUserId },
  })
}
