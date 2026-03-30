/**
 * Per-user market selection for daily digest — avoids repeating the same market
 * and prioritizes unvoted / new / trending markets.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type DigestMarketRow = {
  id: string
  title: string
  current_probability: number | null
  market_type: string | null
  total_votes: number | null
  created_at: string
}

export type DigestVariant = 'new' | 'trending' | 'unvoted' | 'fallback'

export type DigestSelection = { market: DigestMarketRow; variant: DigestVariant }

/** Built once per cron run; shared across users. */
export type DailyDigestPrefetch = {
  markets: DigestMarketRow[]
  votes24hByMarket: Map<string, number>
}

const MS_48H = 48 * 60 * 60 * 1000
const MS_14D = 14 * 24 * 60 * 60 * 1000

export async function prefetchDailyDigestData(admin: SupabaseClient): Promise<DailyDigestPrefetch> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: votes24h } = await admin
    .from('market_votes')
    .select('market_id')
    .gte('created_at', since24h)

  const votes24hByMarket = new Map<string, number>()
  for (const v of votes24h ?? []) {
    const mid = (v as { market_id: string }).market_id
    votes24hByMarket.set(mid, (votes24hByMarket.get(mid) ?? 0) + 1)
  }

  const { data: markets } = await admin
    .from('prediction_markets')
    .select('id, title, current_probability, market_type, total_votes, created_at')
    .in('status', ['active', 'trading'])
    .is('archived_at', null)
    .gt('total_votes', 0)

  return {
    markets: (markets ?? []) as DigestMarketRow[],
    votes24hByMarket,
  }
}

/**
 * Select one market for a user. Returns null if nothing to send (cooldown + empty pool).
 */
export async function selectMarketForDailyDigest(
  admin: SupabaseClient,
  userId: string,
  prefetch: DailyDigestPrefetch
): Promise<DigestSelection | null> {
  const now = Date.now()
  const since14d = new Date(now - MS_14D).toISOString()

  const [{ data: votedRows }, { data: logRows }] = await Promise.all([
    admin.from('market_votes').select('market_id').eq('user_id', userId),
    admin
      .from('email_digest_log')
      .select('market_id')
      .eq('user_id', userId)
      .gte('sent_at', since14d),
  ])

  const votedSet = new Set((votedRows ?? []).map((r) => (r as { market_id: string }).market_id))
  const emailedSet = new Set((logRows ?? []).map((r) => (r as { market_id: string }).market_id))

  const { markets, votes24hByMarket } = prefetch
  const eligible = markets.filter((m) => !emailedSet.has(m.id))
  if (eligible.length === 0) return null

  const primary = eligible.filter((m) => !votedSet.has(m.id))

  const scoreSort = (a: DigestMarketRow, b: DigestMarketRow) => {
    const va = votes24hByMarket.get(a.id) ?? 0
    const vb = votes24hByMarket.get(b.id) ?? 0
    if (vb !== va) return vb - va
    const ta = Number(a.total_votes ?? 0)
    const tb = Number(b.total_votes ?? 0)
    if (tb !== ta) return tb - ta
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }

  if (primary.length > 0) {
    const newOnes = primary.filter((m) => now - new Date(m.created_at).getTime() < MS_48H)
    if (newOnes.length > 0) {
      newOnes.sort(scoreSort)
      const m = newOnes[0]!
      return { market: m, variant: 'new' }
    }

    const sorted = [...primary].sort(scoreSort)
    const m = sorted[0]!
    const v24 = votes24hByMarket.get(m.id) ?? 0
    return { market: m, variant: v24 > 0 ? 'trending' : 'unvoted' }
  }

  const fallback = [...eligible].sort(scoreSort)
  const m = fallback[0]!
  return { market: m, variant: 'fallback' }
}
