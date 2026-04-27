import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createClient()

    const [marketsRes, fundRes] = await Promise.all([
      supabase
        .from('prediction_markets')
        .select('id, total_volume, category')
        .in('status', ['active', 'trading'])
        .is('archived_at', null)
        .eq('is_draft', false),
      supabase
        .from('conscious_fund')
        .select('current_balance, total_disbursed')
        .limit(1)
        .single(),
    ])

    if (marketsRes.error) {
      console.error('Markets stats error:', marketsRes.error)
      return NextResponse.json(
        { error: marketsRes.error.message },
        { status: 500 }
      )
    }

    const markets = marketsRes.data || []
    const totalMarkets = markets.length
    const totalVolume = markets.reduce((sum, m) => sum + (Number(m.total_volume) || 0), 0)
    const fundBalance = fundRes.data?.current_balance ?? 0
    const grantsAwarded = fundRes.data?.total_disbursed ?? 0

    const categoryCounts = markets.reduce(
      (acc, m) => {
        const cat = m.category || 'other'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      totalMarketsActive: totalMarkets,
      totalVolume,
      consciousFundBalance: Number(fundBalance),
      grantsAwarded: Number(grantsAwarded),
      categoryCounts,
    })
  } catch (err) {
    console.error('Predictions stats error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
