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

    const { id: marketId } = await params
    const supabase = await createClient()

    const [
      { data: positions },
      { data: trades },
    ] = await Promise.all([
      supabase
        .from('prediction_positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('market_id', marketId),
      supabase
        .from('prediction_trades')
        .select('conscious_fund_amount')
        .eq('user_id', user.id)
        .eq('market_id', marketId)
        .eq('status', 'filled'),
    ])

    const userContribution =
      trades?.reduce((sum, t) => sum + Number(t.conscious_fund_amount), 0) ?? 0

    return NextResponse.json({
      positions: positions || [],
      userContribution,
    })
  } catch (err) {
    console.error('User stats error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    )
  }
}
