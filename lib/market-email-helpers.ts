import type { SupabaseClient } from '@supabase/supabase-js'

/** Plain-text line for "La comunidad dice …" in emails */
export async function getCommunityProbabilitySummary(
  admin: SupabaseClient,
  marketId: string,
  market: {
    current_probability?: number | string | null
    market_type?: string | null
  }
): Promise<string> {
  const mt = market.market_type ?? 'binary'
  if (mt === 'multi') {
    const { data: leading } = await admin
      .from('market_outcomes')
      .select('label, probability')
      .eq('market_id', marketId)
      .order('probability', { ascending: false })
      .limit(1)
      .maybeSingle()
    const p =
      leading?.probability != null
        ? Number(leading.probability) * 100
        : Number(market.current_probability) > 1
          ? Number(market.current_probability)
          : Number(market.current_probability) * 100
    const lbl = leading?.label ?? '—'
    return `${Math.round(p)}% ${lbl} (líder)`
  }
  const yes = Number(market.current_probability)
  const pct = yes > 1 ? Math.round(yes) : Math.round(yes * 100)
  return `${pct}% YES`
}

/** 0–100 style % for binary YES; multi = leading outcome % */
export async function getMarketYesPercentForCard(
  admin: SupabaseClient,
  marketId: string,
  market: { current_probability?: number | string | null; market_type?: string | null }
): Promise<number> {
  const mt = market.market_type ?? 'binary'
  if (mt === 'multi') {
    const { data: leading } = await admin
      .from('market_outcomes')
      .select('probability')
      .eq('market_id', marketId)
      .order('probability', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (leading?.probability != null) return Math.round(Number(leading.probability) * 100)
  }
  const yes = Number(market.current_probability)
  return yes > 1 ? Math.round(yes) : Math.round(yes * 100)
}
