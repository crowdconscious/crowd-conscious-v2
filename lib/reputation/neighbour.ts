/**
 * Neighbour-participated reputation award.
 *
 * Spec §3.6 allows awarding when a neighbour you invited then participates.
 * Mobile schema reserves `neighbor_participation` (no auto trigger yet).
 * Attribution beyond `app_referral_clicks` is not wired — call from the first
 * civic action of a referred user once that chain exists.
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
    alcaldiaSlug: string
    alcaldiaLabel?: string | null
    /** Stable id for idempotency — e.g. neighbour user id or referral row id. */
    attributionObjectId: string
  }
) {
  if (params.referrerUserId === params.neighbourUserId) {
    return { success: false as const, error: 'skip_self' }
  }

  return awardCivicReputation(admin, {
    userId: params.referrerUserId,
    actionType: 'neighbor_participation',
    actionId: `neighbor:${params.attributionObjectId}`,
    domain: params.domain,
    alcaldiaSlug: params.alcaldiaSlug,
    alcaldiaLabel: params.alcaldiaLabel ?? null,
    objectId: params.attributionObjectId,
    metadata: { neighbour_user_id: params.neighbourUserId },
  })
}
