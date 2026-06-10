import { createAdminClient } from '@/lib/supabase-admin'
import type { PulseEmbedData } from '@/components/blog/PulseEmbed'
import type { PulseOutcomeRow } from '@/components/pulse/PulseResultClient'
import type { PulseVoteLike } from '@/lib/pulse-vote-aggregates'

export async function fetchPulseEmbedDataForBlog(marketId: string): Promise<PulseEmbedData | null> {
  const admin = createAdminClient()
  // Public blog pages must never serialize voter identities. The embed only
  // needs the three fields the aggregate/insight math consumes (same
  // approach as the /pulse/[id] payload fix in lib/pulse-vote-aggregates.ts)
  // — no vote ids, no user_id / anonymous_participant_id, no reasoning.
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
      market_outcomes ( id, label, subtitle, probability, sort_order, translations ),
      market_votes ( confidence, outcome_id, created_at )
    `
    )
    .eq('id', marketId)
    .eq('is_draft', false)
    .maybeSingle()

  if (error || !market) {
    console.error('[blog pulse embed]', error)
    return null
  }

  const votes = (market.market_votes ?? []) as PulseVoteLike[]
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
