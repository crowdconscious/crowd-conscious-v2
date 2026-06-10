import { createAdminClient } from '@/lib/supabase-admin'
import { CREATOR_SCORE_REVEAL_THRESHOLD } from '@/lib/creators/types'

/**
 * Recomputes conscious_score, approval_rate, avg_confidence, total_votes
 * from market_outcomes vote_count / total_confidence for the creator's
 * current market. Same formula as lib/locations/recalculate-score.ts:
 * approval_rate x avg_confidence x 10, score null until >= 10 votes.
 */
export async function recalculateCreatorScore(certificationId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: cert, error: certErr } = await supabase
    .from('creator_certifications')
    .select('id, current_market_id')
    .eq('id', certificationId)
    .maybeSingle()

  if (certErr || !cert?.current_market_id) return

  const { data: outcomes } = await supabase
    .from('market_outcomes')
    .select('id, label, vote_count, total_confidence')
    .eq('market_id', cert.current_market_id)
    .order('sort_order', { ascending: true })

  const yesOutcome = outcomes?.[0]
  const noOutcome = outcomes?.[1]

  const totalVotes = (yesOutcome?.vote_count ?? 0) + (noOutcome?.vote_count ?? 0)

  if (totalVotes === 0) {
    await supabase
      .from('creator_certifications')
      .update({
        conscious_score: null,
        approval_rate: null,
        avg_confidence: null,
        total_votes: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', certificationId)
    return
  }

  const approvalRate = (yesOutcome?.vote_count ?? 0) / totalVotes
  const totalConfidence = (yesOutcome?.total_confidence ?? 0) + (noOutcome?.total_confidence ?? 0)
  const avgConfidence = totalConfidence / totalVotes

  const consciousScore =
    totalVotes >= CREATOR_SCORE_REVEAL_THRESHOLD
      ? Math.round(approvalRate * avgConfidence * 10) / 10
      : null

  await supabase
    .from('creator_certifications')
    .update({
      conscious_score: consciousScore,
      approval_rate: Math.round(approvalRate * 100) / 100,
      avg_confidence: Math.round(avgConfidence * 10) / 10,
      total_votes: totalVotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', certificationId)
}

export async function recalculateCreatorScoreByMarketId(marketId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data: cert } = await supabase
    .from('creator_certifications')
    .select('id')
    .eq('current_market_id', marketId)
    .maybeSingle()

  if (cert?.id) {
    await recalculateCreatorScore(cert.id)
  }
}
