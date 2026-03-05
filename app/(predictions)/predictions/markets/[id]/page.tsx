import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { MarketDetailClient } from './MarketDetailClient'

export const dynamic = 'force-dynamic'

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getCurrentUser()

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
    { data: outcomes },
    { data: myVoteRow },
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
    supabase
      .from('market_outcomes')
      .select('id, label, probability, vote_count, total_confidence, is_winner, sort_order')
      .eq('market_id', id)
      .order('sort_order', { ascending: true }),
    user
      ? supabase
          .from('market_votes')
          .select('outcome_id, confidence, xp_earned, is_correct, bonus_xp')
          .eq('market_id', id)
          .eq('user_id', user.id)
          .single()
      : Promise.resolve({ data: null }),
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

  const voteCount = (market as { total_votes?: number }).total_votes ?? tradeCountRes?.count ?? 0
  const outcomesList = (outcomes || []).map((o) => ({
    id: o.id,
    label: o.label,
    probability: Number(o.probability),
    vote_count: o.vote_count ?? 0,
    total_confidence: o.total_confidence ?? 0,
    is_winner: o.is_winner,
  }))

  let myVote: { outcome_id: string; outcome_label: string; confidence: number; xp_earned: number; is_correct: boolean | null; bonus_xp: number } | null = null
  if (myVoteRow) {
    const outcomeLabel = (outcomes || []).find((o) => o.id === myVoteRow.outcome_id)?.label ?? null
    myVote = {
      outcome_id: myVoteRow.outcome_id,
      outcome_label: outcomeLabel ?? 'Unknown',
      confidence: myVoteRow.confidence,
      xp_earned: myVoteRow.xp_earned,
      is_correct: myVoteRow.is_correct,
      bonus_xp: myVoteRow.bonus_xp ?? 0,
    }
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
      tradeCount={voteCount}
      totalConsciousFromMarket={totalConsciousFromMarket}
      resolutionEvidence={resolutionEvidence}
      outcomes={outcomesList}
      myVote={myVote}
    />
  )
}
