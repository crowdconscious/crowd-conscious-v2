import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

const VALID_TIMEFRAMES = ['1d', '7d', '30d', 'all'] as const

function getTimeRange(timeframe: string): { start: Date | null } {
  const now = new Date()
  switch (timeframe) {
    case '1d':
      return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
    case '7d':
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
    case '30d':
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
    case 'all':
    default:
      return { start: null }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { marketId } = await params
    const { searchParams } = new URL(request.url)
    const timeframe = (searchParams.get('timeframe') || '30d') as (typeof VALID_TIMEFRAMES)[number]

    if (!VALID_TIMEFRAMES.includes(timeframe)) {
      return NextResponse.json(
        { error: `Invalid timeframe. Use one of: ${VALID_TIMEFRAMES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: market } = await supabase
      .from('prediction_markets')
      .select('id')
      .eq('id', marketId)
      .single()

    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    const { start } = getTimeRange(timeframe)

    let query = supabase
      .from('prediction_market_history')
      .select('probability, volume_24h, trade_count, recorded_at')
      .eq('market_id', marketId)
      .order('recorded_at', { ascending: true })

    if (start) {
      query = query.gte('recorded_at', start.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('History fetch error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      marketId,
      timeframe,
      history: data ?? [],
    })
  } catch (err) {
    console.error('History route error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
