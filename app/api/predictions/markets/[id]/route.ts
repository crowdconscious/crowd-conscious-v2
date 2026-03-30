import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { data: market, error: marketError } = await supabase
      .from('prediction_markets')
      .select('*')
      .eq('id', id)
      .single()

    if (marketError || !market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      )
    }

    const [
      { data: history },
      { data: agentContent },
      { data: sentiment },
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
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('sentiment_scores')
        .select('score, source, recorded_at')
        .eq('market_id', id)
        .order('recorded_at', { ascending: false })
        .limit(30),
    ])

    let trades: { side: string; amount: number; price: number; created_at: string }[] = []
    try {
      const { data } = await supabase.rpc('get_market_trades_anon', { p_market_id: id })
      trades = data ?? []
    } catch {
      trades = []
    }

    const { data: creator } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', market.created_by)
      .single()

    const tradeCount = await supabase
      .from('prediction_trades')
      .select('id', { count: 'exact', head: true })
      .eq('market_id', id)

    const consciousFundFromMarket = await supabase
      .from('conscious_fund_transactions')
      .select('amount')
      .eq('market_id', id)
      .eq('source_type', 'trade_fee')

    const totalConsciousFromMarket =
      consciousFundFromMarket.data?.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      ) ?? 0

    return NextResponse.json({
      market,
      creator: creator?.full_name || 'Unknown',
      history: history || [],
      agentContent: agentContent || [],
      sentiment: sentiment || [],
      trades,
      tradeCount: tradeCount.count ?? 0,
      totalConsciousFromMarket,
    })
  } catch (err) {
    console.error('Market fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch market' },
      { status: 500 }
    )
  }
}
