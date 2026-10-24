import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Most active registered users, ranked by real actions (market votes cast).
 * Replaces the retired XP ranking. Anonymous votes are excluded.
 */
export async function getTopVoterIds(
  admin: SupabaseClient,
  limit: number
): Promise<{ user_id: string; votes: number }[]> {
  let rows: { user_id: string | null }[] = []
  try {
    const { data, error } = await admin
      .from('market_votes')
      .select('user_id')
      .not('user_id', 'is', null)
      .or('is_anonymous.is.null,is_anonymous.eq.false')
      .limit(50000)
    if (error) throw error
    rows = (data ?? []) as { user_id: string | null }[]
  } catch {
    const { data } = await admin
      .from('market_votes')
      .select('user_id')
      .not('user_id', 'is', null)
      .limit(50000)
    rows = (data ?? []) as { user_id: string | null }[]
  }
  const counts = new Map<string, number>()
  for (const r of rows) {
    if (!r.user_id) continue
    counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([user_id, votes]) => ({ user_id, votes }))
}
