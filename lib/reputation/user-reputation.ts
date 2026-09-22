/**
 * Private civic reputation page data loader.
 * Auth-only; never exposes other users' totals.
 *
 * Sustained-presence is the only app-layer award checked here — cosign / stage /
 * location awards come from mobile DB triggers.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchOwnCivicReputation,
  maybeAwardSustainedPresence,
  type CivicReputationSnapshot,
} from '@/lib/reputation/award'
import { isCivicReputationEnabled } from '@/lib/reputation/domains'
import { createAdminClient } from '@/lib/supabase-admin'

export async function loadPrivateCivicReputation(
  supabase: SupabaseClient,
  userId: string
): Promise<CivicReputationSnapshot> {
  if (isCivicReputationEnabled()) {
    try {
      const admin = createAdminClient()
      await maybeAwardSustainedPresence(admin, userId)
    } catch (err) {
      console.warn('[civic-reputation] sustained presence check failed', err)
    }
  }

  return fetchOwnCivicReputation(supabase, userId)
}
