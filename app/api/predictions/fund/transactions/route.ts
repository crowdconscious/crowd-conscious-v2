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
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

    const supabase = await createClient()

    const { data: transactions, error } = await supabase
      .from('conscious_fund_transactions')
      .select(
        `
        id,
        amount,
        source_type,
        market_id,
        description,
        created_at,
        prediction_markets(id, title)
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Fund transactions fetch error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      transactions: transactions ?? [],
      pagination: { limit, offset },
    })
  } catch (err) {
    console.error('Fund transactions route error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
