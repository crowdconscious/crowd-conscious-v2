import { createAdminClient } from '@/lib/supabase-admin'
import type { PulseEmbedData } from '@/components/blog/PulseEmbed'
import type { PulseOutcomeRow } from '@/components/pulse/PulseResultClient'
import type { PulseVoteLike } from '@/lib/pulse-vote-aggregates'

export async function fetchPulseEmbedDataForBlog(marketId: string): Promise<PulseEmbedData | null> {
  const admin = createAdminClient()
  // Public blog pages must never serialize voter identities. The embed only
  // needs the fields the aggregate/insight math consumes (same approach as
  // the /pulse/[id] payload fix in lib/pulse-vote-aggregates.ts) — no vote
  // ids exposed to the client, no user_id / anonymous_participant_id, no
  // reasoning. We still select vote id server-side to attach multi picks.
  const { data: market, error } = await admin
    .from('prediction_markets')
    .select(
      `
      id,
      title,
      description,
      translations,
      status,
      resolution_date,
      is_pulse,
      vote_mode,
      total_votes,
      market_outcomes (
        id, label, subtitle, probability, sort_order, translations,
        vote_count, total_confidence, confident_pick_count
      ),
      market_votes ( id, confidence, outcome_id, created_at )
    `
    )
    .eq('id', marketId)
    .eq('is_draft', false)
    .maybeSingle()

  if (error || !market) {
    console.error('[blog pulse embed]', error)
    return null
  }

  const rawVotes = (market.market_votes ?? []) as Array<{
    id: string
    confidence: number | null
    outcome_id: string
    created_at: string
  }>
  const voteIds = rawVotes.map((v) => v.id)
  const selectionsByVote = new Map<string, { outcome_id: string; confidence: number }[]>()
  if (voteIds.length > 0) {
    const { data: sels } = await admin
      .from('market_vote_selections')
      .select('vote_id, outcome_id, confidence')
      .in('vote_id', voteIds)
    for (const row of sels ?? []) {
      const r = row as { vote_id: string; outcome_id: string; confidence: number }
      const list = selectionsByVote.get(r.vote_id) ?? []
      list.push({ outcome_id: r.outcome_id, confidence: r.confidence })
      selectionsByVote.set(r.vote_id, list)
    }
  }

  // Strip vote ids before handing to the client payload.
  const votes: PulseVoteLike[] = rawVotes.map((v) => ({
    confidence: v.confidence,
    outcome_id: v.outcome_id,
    created_at: v.created_at,
    selections: selectionsByVote.get(v.id) ?? null,
  }))
  const outcomes = (market.market_outcomes ?? []) as PulseOutcomeRow[]

  return {
    marketId: market.id,
    title: market.title,
    description: market.description,
    translations: market.translations,
    status: market.status,
    resolutionDate: market.resolution_date,
    outcomes,
    votes,
  }
}
