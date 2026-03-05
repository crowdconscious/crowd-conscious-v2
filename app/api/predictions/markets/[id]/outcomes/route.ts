import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('market_outcomes')
      .select('id, label, probability, vote_count, total_confidence, is_winner, sort_order')
      .eq('market_id', id)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch outcomes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ outcomes: data || [] })
  } catch (err) {
    console.error('Outcomes fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch outcomes' },
      { status: 500 }
    )
  }
}
