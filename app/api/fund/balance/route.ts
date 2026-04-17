import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { consciousFundBalanceMxn } from '@/lib/conscious-fund-balance'
import { CONSCIOUS_FUND_GOAL_MXN } from '@/lib/predictions/fund-goal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Public read of the Conscious Fund headline numbers, used by the landing
 * thermometer, the footer thermometer, and any client that wants a fresh
 * balance without server rendering.
 *
 * Cached for 5 minutes at the CDN edge: the underlying fund balance only
 * changes on Stripe webhooks and trade RPCs, so freshness < 5 minutes is
 * never required.
 */
export async function GET() {
  try {
    const admin = createAdminClient()

    const [{ data: fund }, { count: txCount }, { count: causesCount }] = await Promise.all([
      admin
        .from('conscious_fund')
        .select('current_balance, total_collected, total_disbursed')
        .limit(1)
        .single(),
      admin.from('conscious_fund_transactions').select('id', { count: 'exact', head: true }),
      admin.from('fund_causes').select('id', { count: 'exact', head: true }).eq('active', true),
    ])

    const totalMxn = consciousFundBalanceMxn(fund ?? undefined)
    const goalMxn = CONSCIOUS_FUND_GOAL_MXN

    return NextResponse.json(
      {
        total_mxn: totalMxn,
        goal_mxn: goalMxn,
        progress_pct: Math.min(100, Math.round((totalMxn / goalMxn) * 100)),
        transaction_count: txCount ?? 0,
        causes_supported: causesCount ?? 0,
      },
      {
        headers: {
          // Never let the CDN cache this — we were seeing the footer
          // thermometer stuck at $0 MXN (from the first pre-seed deploy) while
          // the SSR landing hero showed the real balance. Forcing no-store
          // keeps every client render in sync with the admin DB read.
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    )
  } catch (err) {
    console.error('[fund/balance]', err)
    return NextResponse.json({ error: 'Failed to load fund balance' }, { status: 500 })
  }
}
