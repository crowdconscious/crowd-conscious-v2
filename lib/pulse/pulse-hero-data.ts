import { createClient } from '@/lib/supabase-server'

export type PulseHeroMarket = {
  id: string
  title: string
  translations: unknown
  total_votes: number | null
  /** Canonical Pulse hero art (migration 174). Legacy twin: image_url. */
  cover_image_url: string | null
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
    .select('id, title, translations, total_votes, cover_image_url, image_url')
    .in('status', ['active', 'trading'])
    .is('archived_at', null)
    .eq('is_draft', false)
    .or('is_pulse.eq.true,category.eq.pulse')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const row = pulseRow as {
    id: string
    title: string
    translations: unknown
    total_votes: number | null
    cover_image_url: string | null
    image_url?: string | null
  } | null
  const market: PulseHeroMarket | null = row
    ? {
        id: row.id,
        title: row.title,
        translations: row.translations,
        total_votes: row.total_votes,
        cover_image_url:
          row.cover_image_url?.trim() || row.image_url?.trim() || null,
      }
    : null
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
