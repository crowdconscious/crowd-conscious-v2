import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const market_id = searchParams.get('market_id')
    const outcome = searchParams.get('outcome')

    if (!market_id || !outcome || !['yes', 'no', 'true', 'false'].includes(outcome.toLowerCase())) {
      return NextResponse.json(
        { error: 'market_id and outcome (yes/no) required' },
        { status: 400 }
      )
    }

    const winningSide = outcome.toLowerCase() === 'yes' || outcome.toLowerCase() === 'true' ? 'yes' : 'no'

    const { data: positions } = await supabase
      .from('prediction_positions')
      .select('user_id, shares, average_price')
      .eq('market_id', market_id)
      .eq('side', winningSide)
      .gt('shares', 0)

    const totalPayout = (positions || []).reduce((sum, p) => sum + Number(p.shares) * 10, 0)
    const traderCount = new Set((positions || []).map((p) => p.user_id)).size

    return NextResponse.json({
      total_payout: totalPayout,
      trader_count: traderCount,
      winning_side: winningSide,
    })
  } catch (err) {
    console.error('Estimate error:', err)
    return NextResponse.json(
      { error: 'Failed to estimate' },
      { status: 500 }
    )
  }
}
