import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'
import { isValidMarketCategory } from '@/lib/market-categories'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')?.trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    let query = supabase
      .from('prediction_markets')
      .select('*')
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (category && category !== 'all' && isValidMarketCategory(category)) {
      query = query.eq('category', category)
    }

    if (search) {
      const pattern = `%${search}%`
      query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Public markets API error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ markets: (data || []) as PredictionMarket[] })
  } catch (err) {
    console.error('Markets API error:', err)
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 })
  }
}
