import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { MarketDetailClient } from './MarketDetailClient'

export const dynamic = 'force-dynamic'

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: market, error: marketError } = await supabase
    .from('prediction_markets')
    .select('*')
    .eq('id', id)
    .single()

  if (marketError || !market) {
    notFound()
  }

  const [
    { data: history },
    { data: agentContent },
    { data: sentiment },
    { data: creator },
    tradeCountRes,
    consciousRes,
  ] = await Promise.all([
    supabase
      .from('prediction_market_history')
      .select('probability, volume_24h, trade_count, recorded_at')
      .eq('market_id', id)
      .order('recorded_at', { ascending: true })
      .limit(90),
    supabase
      .from('agent_content')
      .select('*')
      .eq('market_id', id)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('sentiment_scores')
      .select('score, source, recorded_at')
      .eq('market_id', id)
      .order('recorded_at', { ascending: false })
      .limit(30),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', market.created_by)
      .single(),
    supabase
      .from('prediction_trades')
      .select('id', { count: 'exact', head: true })
      .eq('market_id', id),
    supabase
      .from('conscious_fund_transactions')
      .select('amount')
      .eq('market_id', id)
      .eq('source_type', 'trade_fee'),
  ])

  let trades: { side: string; amount: number; price: number; fee_amount?: number; conscious_fund_amount?: number; shares?: number; created_at: string }[] = []
  try {
    const { data } = await supabase.rpc('get_market_trades_anon', { p_market_id: id })
    trades = data ?? []
  } catch {
    trades = []
  }
  const totalConsciousFromMarket =
    (consciousRes?.data ?? []).reduce((sum, t) => sum + Number(t.amount), 0)

  let totalPayout = 0
  if (market.status === 'resolved' && market.resolved_outcome != null) {
    const winningSide = market.resolved_outcome ? 'yes' : 'no'
    const winningTrades = trades.filter((t: { side: string }) => t.side === winningSide)
    totalPayout = winningTrades.reduce((sum: number, t: { shares?: number; amount?: number; price?: number; fee_amount?: number; conscious_fund_amount?: number }) => {
      const shares = t.shares ?? (Number(t.amount) - Number(t.fee_amount ?? 0) - Number(t.conscious_fund_amount ?? 0)) / (Number(t.price) * 10 || 1)
      return sum + shares * 10
    }, 0)
  }

  const resolutionEvidence = (market.resolution_evidence as { evidence_url?: string }) || {}

  return (
    <MarketDetailClient
      market={market}
      creatorName={creator?.full_name || 'Unknown'}
      history={history || []}
      agentContent={agentContent || []}
      sentiment={sentiment || []}
      trades={trades}
      tradeCount={tradeCountRes?.count ?? 0}
      totalConsciousFromMarket={totalConsciousFromMarket}
      totalPayout={totalPayout}
      resolutionEvidence={resolutionEvidence}
    />
  )
}
