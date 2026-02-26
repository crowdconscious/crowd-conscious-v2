import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export type HistoryItem = {
  id: string
  type: 'deposit' | 'trade'
  date: string
  amount: number
  status: string
  market_title?: string
  side?: string
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

    const supabase = await createClient()

    // Get wallet for stats
    const { data: wallet } = await supabase.rpc('get_or_create_prediction_wallet', {
      p_user_id: user.id,
    })

    // User's conscious fund contribution (sum of conscious_fund_amount from trades)
    const { data: contribData } = await supabase
      .from('prediction_trades')
      .select('conscious_fund_amount')
      .eq('user_id', user.id)

    const consciousFundContributed =
      contribData?.reduce((sum, t) => sum + Number(t.conscious_fund_amount), 0) ?? 0

    // Fetch deposits
    const { data: deposits } = await supabase
      .from('prediction_deposits')
      .select('id, amount, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, limit + offset + 50) // over-fetch to merge with trades

    // Fetch trades with market title
    const { data: trades } = await supabase
      .from('prediction_trades')
      .select(
        `
        id,
        amount,
        side,
        status,
        conscious_fund_amount,
        created_at,
        prediction_markets(title)
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, limit + offset + 50)

    const depositItems: HistoryItem[] = (deposits ?? []).map((d) => ({
      id: d.id,
      type: 'deposit',
      date: d.created_at,
      amount: Number(d.amount),
      status: d.status,
    }))

    const tradeItems: HistoryItem[] = (trades ?? []).map((t) => ({
      id: t.id,
      type: 'trade',
      date: t.created_at,
      amount: Number(t.amount),
      status: t.status,
      market_title: (t.prediction_markets as { title?: string } | null)?.title,
      side: t.side,
    }))

    const merged = [...depositItems, ...tradeItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    const paginated = merged.slice(offset, offset + limit)

    return NextResponse.json({
      items: paginated,
      stats: {
        totalDeposited: Number(wallet?.total_deposited ?? 0),
        totalWon: Number(wallet?.total_won ?? 0),
        totalLost: Number(wallet?.total_lost ?? 0),
        consciousFundContributed,
      },
      pagination: {
        limit,
        offset,
        total: merged.length,
      },
    })
  } catch (err) {
    console.error('History route error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
