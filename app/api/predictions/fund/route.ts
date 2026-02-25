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

    const [
      { data: fund, error: fundError },
      { data: recentTx, error: txError },
    ] = await Promise.all([
      supabase
        .from('conscious_fund')
        .select('current_balance, total_collected, total_disbursed')
        .limit(1)
        .single(),
      supabase
        .from('conscious_fund_transactions')
        .select('id, amount, source_type, market_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (fundError) {
      console.error('Fund fetch error:', fundError)
      return NextResponse.json(
        { error: fundError.message || 'Failed to fetch fund' },
        { status: 500 }
      )
    }

    const { data: userContrib } = await supabase
      .from('prediction_trades')
      .select('conscious_fund_amount')
      .eq('user_id', user.id)

    const userContribution =
      userContrib?.reduce((sum, t) => sum + Number(t.conscious_fund_amount), 0) ?? 0

    return NextResponse.json({
      fund: fund ?? {
        current_balance: 0,
        total_collected: 0,
        total_disbursed: 0,
      },
      recentTransactions: recentTx ?? [],
      userContribution,
    })
  } catch (err) {
    console.error('Fund route error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch fund' },
      { status: 500 }
    )
  }
}
