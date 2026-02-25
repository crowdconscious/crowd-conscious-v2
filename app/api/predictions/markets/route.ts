import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const category = searchParams.get('category')

    let query = supabase
      .from('prediction_markets')
      .select('*')
      .in('status', ['active', 'trading'])
      .order('total_volume', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search) {
      const pattern = `%${search}%`
      query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Predictions markets fetch error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ markets: data as PredictionMarket[] })
  } catch (err) {
    console.error('Predictions markets error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    )
  }
}
