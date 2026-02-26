import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { data: markets, error } = await supabase
      .from('prediction_markets')
      .select('*')
      .in('status', ['active', 'trading'])
      .order('resolution_date', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const now = new Date().toISOString()
    const pastDue = (markets || []).filter((m) => m.resolution_date < now)
    const upcoming = (markets || []).filter((m) => m.resolution_date >= now)

    const withCounts = await Promise.all(
      (markets || []).map(async (m) => {
        const { data: trades } = await supabase
          .from('prediction_trades')
          .select('user_id')
          .eq('market_id', m.id)
        const userIds = new Set((trades || []).map((t) => t.user_id))
        return {
          ...m,
          trade_count: trades?.length ?? 0,
          trader_count: userIds.size,
        }
      })
    )

    return NextResponse.json({
      markets: withCounts,
      pastDue: withCounts.filter((m) => m.resolution_date < now),
      upcoming: withCounts.filter((m) => m.resolution_date >= now),
    })
  } catch (err) {
    console.error('Markets to resolve error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch' },
      { status: 500 }
    )
  }
}
