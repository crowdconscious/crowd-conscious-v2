import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

const VALID_CATEGORIES = ['world', 'world_cup', 'government', 'sustainability', 'corporate', 'community', 'cause'] as const
const VALID_STATUSES = ['active', 'trading', 'resolved', 'cancelled'] as const
const VALID_SORTS = ['active', 'newest', 'closing', 'debated'] as const

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const sort = searchParams.get('sort') || 'active'
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 100)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))
    const includeArchived = searchParams.get('includeArchived') === '1'

    let query = supabase
      .from('prediction_markets')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)

    if (!includeArchived) {
      query = query.is('archived_at', null)
    }

    if (status && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      query = query.eq('status', status)
    } else {
      query = query.in('status', ['active', 'trading'])
    }

    if (category && category !== 'all' && VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      query = query.eq('category', category)
    }

    if (search) {
      const pattern = `%${search}%`
      query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`)
    }

    const validSort = VALID_SORTS.includes(sort as (typeof VALID_SORTS)[number]) ? sort : 'active'
    if (validSort === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else if (validSort === 'closing') {
      query = query.gt('resolution_date', new Date().toISOString()).order('resolution_date', { ascending: true })
    } else if (validSort === 'debated') {
      query = query.order('engagement_count', { ascending: false, nullsFirst: false })
    } else {
      query = query.order('engagement_count', { ascending: false, nullsFirst: false })
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Predictions markets fetch error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      markets: data as PredictionMarket[],
      pagination: {
        limit,
        offset,
        total: count ?? (data?.length ?? 0),
      },
    })
  } catch (err) {
    console.error('Predictions markets error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    )
  }
}
