import type { SupabaseClient } from '@supabase/supabase-js'

export type LiveEventRankRow = {
  user_id: string
  rank: number
  total_xp: number
  correct_count: number
  vote_count: number
}

/**
 * Server-side leaderboard for a live event (matches hooks/useLiveLeaderboard aggregation).
 */
export async function computeLiveEventLeaderboardRanks(
  admin: SupabaseClient,
  eventId: string
): Promise<LiveEventRankRow[]> {
  const { data: markets, error: mErr } = await admin
    .from('prediction_markets')
    .select('id')
    .eq('live_event_id', eventId)
    .is('archived_at', null)

  if (mErr || !markets?.length) return []

  const marketIds = markets.map((m) => m.id)

  const { data: votes, error: vErr } = await admin
    .from('market_votes')
    .select('user_id, xp_earned, bonus_xp, is_correct')
    .in('market_id', marketIds)
    .eq('is_anonymous', false)

  if (vErr || !votes?.length) return []

  const agg = new Map<string, { total_xp: number; correct_count: number; vote_count: number }>()

  for (const v of votes) {
    const uid = v.user_id as string
    const xp = Number(v.xp_earned ?? 0) + Number(v.bonus_xp ?? 0)
    const cur = agg.get(uid) ?? { total_xp: 0, correct_count: 0, vote_count: 0 }
    cur.total_xp += xp
    cur.vote_count += 1
    if (v.is_correct === true) cur.correct_count += 1
    agg.set(uid, cur)
  }

  const sorted = [...agg.entries()].sort((a, b) => b[1].total_xp - a[1].total_xp)

  return sorted.map(([user_id, s], i) => ({
    user_id,
    rank: i + 1,
    total_xp: s.total_xp,
    correct_count: s.correct_count,
    vote_count: s.vote_count,
  }))
}
