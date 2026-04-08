import { createAdminClient } from '@/lib/supabase-admin'
import type { PulseEmbedData } from '@/components/blog/PulseEmbed'
import type { PulseOutcomeRow, PulseVoteRow } from '@/components/pulse/PulseResultClient'

export async function fetchPulseEmbedDataForBlog(marketId: string): Promise<PulseEmbedData | null> {
  const admin = createAdminClient()
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
      market_outcomes ( id, label, probability, sort_order, translations ),
      market_votes ( id, confidence, outcome_id, created_at, user_id, anonymous_participant_id )
    `
    )
    .eq('id', marketId)
    .maybeSingle()

  if (error || !market) {
    console.error('[blog pulse embed]', error)
    return null
  }

  const votes = (market.market_votes ?? []) as PulseVoteRow[]
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
