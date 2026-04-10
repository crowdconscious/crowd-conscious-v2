import { createClient } from '@/lib/supabase-server'

export type PulseHeroMarket = {
  id: string
  title: string
  translations: unknown
  total_votes: number | null
}

/** Top active Pulse market + avg vote confidence (for product hero / landing). */
export async function fetchPulseHeroHighlight(): Promise<{
  market: PulseHeroMarket | null
  avgConfidence: number | null
  strongOpinions: number
}> {
  const supabase = await createClient()
  const { data: pulseRow } = await supabase
    .from('prediction_markets')
    .select('id, title, translations, total_votes')
    .in('status', ['active', 'trading'])
    .is('archived_at', null)
    .or('is_pulse.eq.true,category.eq.pulse')
    .order('total_votes', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const market = pulseRow as PulseHeroMarket | null
  let avgConfidence: number | null = null
  let strongOpinions = 0
  if (market?.id) {
    const { data: confRows } = await supabase
      .from('market_votes')
      .select('confidence')
      .eq('market_id', market.id)
      .limit(8000)
    if (confRows?.length) {
      const sum = confRows.reduce((s, r) => s + Number(r.confidence), 0)
      avgConfidence = Math.round((sum / confRows.length) * 10) / 10
      strongOpinions = confRows.filter((r) => Number(r.confidence) >= 8).length
    }
  }

  return { market, avgConfidence, strongOpinions }
}
