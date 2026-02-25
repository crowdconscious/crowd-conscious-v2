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
      .select('*, prediction_markets(title, current_probability)')
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

    return NextResponse.json({ positions: data || [] })
  } catch (err) {
    console.error('Positions route error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    )
  }
}
