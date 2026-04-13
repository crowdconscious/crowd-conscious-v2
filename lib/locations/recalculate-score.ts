import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Recomputes conscious_score, approval_rate, avg_confidence, total_votes
 * from market_outcomes vote_count / total_confidence for the location's current market.
 * conscious_score stays null until at least 10 votes (spec).
 */
export async function recalculateLocationScore(locationId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: location, error: locErr } = await supabase
    .from('conscious_locations')
    .select('id, current_market_id')
    .eq('id', locationId)
    .maybeSingle()

  if (locErr || !location?.current_market_id) return

  const { data: outcomes } = await supabase
    .from('market_outcomes')
    .select('id, label, vote_count, total_confidence')
    .eq('market_id', location.current_market_id)
    .order('sort_order', { ascending: true })

  const yesOutcome = outcomes?.[0]
  const noOutcome = outcomes?.[1]

  const totalVotes = (yesOutcome?.vote_count ?? 0) + (noOutcome?.vote_count ?? 0)

  if (totalVotes === 0) {
    await supabase
      .from('conscious_locations')
      .update({
        conscious_score: null,
        approval_rate: null,
        avg_confidence: null,
        total_votes: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', locationId)
    return
  }

  const approvalRate = (yesOutcome?.vote_count ?? 0) / totalVotes
  const totalConfidence = (yesOutcome?.total_confidence ?? 0) + (noOutcome?.total_confidence ?? 0)
  const avgConfidence = totalConfidence / totalVotes

  const consciousScore =
    totalVotes >= 10 ? Math.round(approvalRate * avgConfidence * 10) / 10 : null

  await supabase
    .from('conscious_locations')
    .update({
      conscious_score: consciousScore,
      approval_rate: Math.round(approvalRate * 100) / 100,
      avg_confidence: Math.round(avgConfidence * 10) / 10,
      total_votes: totalVotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', locationId)
}

export async function recalculateLocationScoreByMarketId(marketId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data: location } = await supabase
    .from('conscious_locations')
    .select('id')
    .eq('current_market_id', marketId)
    .maybeSingle()

  if (location?.id) {
    await recalculateLocationScore(location.id)
  }
}
