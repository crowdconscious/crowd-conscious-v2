import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  hasVoteAttribution,
  type VoteAttribution,
} from '@/lib/pulse/vote-attribution'

type AdminClient = SupabaseClient<Database>

/** market_votes Row typing may lag the migration; keep update untyped like reasoning. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function votesTable(admin: AdminClient): any {
  return admin.from('market_votes')
}

/**
 * Attach optional via/src after RPC vote.
 *
 * Best-effort: if migration 275 isn't applied yet, PostgREST errors and we
 * log + continue — the vote itself already succeeded.
 */
export async function persistVoteAttribution(
  admin: AdminClient,
  opts: {
    voteId?: string | null
    attribution: VoteAttribution
  }
): Promise<void> {
  if (!opts.voteId || !hasVoteAttribution(opts.attribution)) return

  const patch: { via?: string; src?: string } = {}
  if (opts.attribution.via) patch.via = opts.attribution.via
  if (opts.attribution.src) patch.src = opts.attribution.src

  const { error } = await votesTable(admin).update(patch).eq('id', opts.voteId)
  if (error) {
    // Common before migration 275: column does not exist.
    console.warn('[vote] persist attribution (non-fatal):', error.message)
  }
}
