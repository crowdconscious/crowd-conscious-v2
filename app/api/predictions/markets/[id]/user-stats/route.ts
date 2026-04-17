import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    // Anonymous visitors on a public market page: return the neutral shape
    // rather than a 401. A 401 here surfaced as a console error and — via
    // unhandled promise rejections in the client — could trip the error
    // boundary on some markets. There's nothing user-specific to expose for
    // an anon visitor, so the "no position, no contribution" response is
    // both correct and cheap.
    const { id: marketId } = await params
    if (!user) {
      return NextResponse.json({
        positions: [],
        userContribution: 0,
        authenticated: false,
      })
    }

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
