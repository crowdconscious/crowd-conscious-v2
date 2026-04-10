import { createClient } from '@/lib/supabase-server'
import { consciousFundBalanceMxn } from '@/lib/conscious-fund-balance'

export const dynamic = 'force-dynamic'
export const revalidate = 300

export async function GET() {
  try {
    const supabase = await createClient()

    const [
      { data: markets, count: marketsCount },
      { data: fund },
      { count: profilesCount },
    ] = await Promise.all([
      supabase
        .from('prediction_markets')
        .select('total_votes', { count: 'exact' })
        .in('status', ['active', 'trading'])
        .is('archived_at', null),
      supabase.from('conscious_fund').select('current_balance, total_collected, total_disbursed').limit(1).single(),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ])

    const totalPredictions = (markets ?? []).reduce(
      (sum, m) => sum + (Number((m as { total_votes?: number }).total_votes) || 0),
      0
    )
    const totalMarkets = marketsCount ?? (markets?.length ?? 0)

    const fundAmount = Math.round(consciousFundBalanceMxn(fund ?? undefined))

    const activeUsers = profilesCount ?? 0

    const body = JSON.stringify({
      totalPredictions: Math.max(0, totalPredictions),
      totalMarkets: Math.max(0, totalMarkets),
      fundAmount: Math.max(0, fundAmount),
      activeUsers: Math.max(0, activeUsers),
    })

    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (e) {
    console.error('[API /public/stats]', e)
    return new Response(
      JSON.stringify({
        totalPredictions: 0,
        totalMarkets: 0,
        fundAmount: 0,
        activeUsers: 0,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    )
  }
}
