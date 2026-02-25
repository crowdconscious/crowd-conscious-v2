import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const marketId = searchParams.get('market_id')

    const supabase = await createClient()
    let query = supabase
      .from('prediction_positions')
      .select('*, prediction_markets(id, title, current_probability, status, resolution_date)')
      .eq('user_id', user.id)

    if (marketId) {
      query = query.eq('market_id', marketId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Positions fetch error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch positions' },
        { status: 500 }
      )
    }

    const positions = (data || []).map((p: Record<string, unknown>) => {
      const market = p.prediction_markets as { current_probability: number } | null
      const shares = Number(p.shares) || 0
      const avgPrice = Number(p.average_price) || 0
      const prob = market?.current_probability ?? 50

      const cost = shares * avgPrice
      const currentValue =
        (p.side as string) === 'yes'
          ? shares * (prob / 100)
          : shares * ((100 - prob) / 100)
      const unrealizedPnl = currentValue - cost

      return {
        ...p,
        cost,
        currentValue,
        unrealizedPnl,
      }
    })

    return NextResponse.json({ positions })
  } catch (err) {
    console.error('Positions route error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    )
  }
}
