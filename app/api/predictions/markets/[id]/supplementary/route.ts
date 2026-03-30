import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * Lazy-loaded market detail payload: history, agent content, sentiment, trades.
 * Keeps initial page load to market + outcomes + my vote.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: marketId } = await params
    const supabase = await createClient()

    const [
      { data: history },
      marketAgent,
      generalAgent,
      { data: sentiment },
      consciousRes,
    ] = await Promise.all([
      supabase
        .from('prediction_market_history')
        .select('probability, volume_24h, trade_count, recorded_at')
        .eq('market_id', marketId)
        .order('recorded_at', { ascending: true })
        .limit(90),
      supabase
        .from('agent_content')
        .select('*')
        .eq('market_id', marketId)
        .eq('published', true)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('agent_content')
        .select('*')
        .is('market_id', null)
        .eq('published', true)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('sentiment_scores')
        .select('score, source, recorded_at')
        .eq('market_id', marketId)
        .order('recorded_at', { ascending: false })
        .limit(30),
      supabase
        .from('conscious_fund_transactions')
        .select('amount')
        .eq('market_id', marketId)
        .eq('source_type', 'trade_fee'),
    ])

    const agentContent =
      (marketAgent.data?.length ? marketAgent.data : generalAgent.data) ?? []

    let trades: Array<{
      side: string
      amount: number
      price: number
      fee_amount?: number
      conscious_fund_amount?: number
      shares?: number
      created_at: string
    }> = []
    try {
      const { data } = await supabase.rpc('get_market_trades_anon', { p_market_id: marketId })
      trades = data ?? []
    } catch {
      trades = []
    }

    const totalConsciousFromMarket = (consciousRes.data ?? []).reduce(
      (sum, t) => sum + Number(t.amount),
      0
    )

    return NextResponse.json({
      history: history ?? [],
      agentContent,
      sentiment: sentiment ?? [],
      trades,
      totalConsciousFromMarket,
    })
  } catch (err) {
    console.error('[supplementary]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
