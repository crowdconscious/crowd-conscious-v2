import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type AdminClient = SupabaseClient<Database>

/** market_votes Row typing does not expose `.update()` payload on this project's generated client */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function votesTable(admin: AdminClient): any {
  return admin.from('market_votes')
}

/**
 * Attach optional reasoning after RPC vote (column not in legacy RPC inserts).
 */
export async function persistVoteReasoning(
  admin: AdminClient,
  opts: {
    reasoning: string | null
    marketId: string
    voteId?: string | null
    userId?: string | null
    noChange?: boolean
  }
): Promise<void> {
  if (!opts.reasoning) return

  if (opts.voteId) {
    const { error } = await votesTable(admin).update({ reasoning: opts.reasoning }).eq('id', opts.voteId)
    if (error) console.error('[vote] persist reasoning by vote id', error)
    return
  }

  if (opts.noChange && opts.userId) {
    const { error } = await votesTable(admin)
      .update({ reasoning: opts.reasoning })
      .eq('market_id', opts.marketId)
      .eq('user_id', opts.userId)
    if (error) console.error('[vote] persist reasoning no_change', error)
  }
}
