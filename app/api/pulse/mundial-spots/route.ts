import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Public count of remaining founding-sponsor spots for the Mundial Pulse Pack.
 * The founding tier (`mundial_pack_founding`) is capped at 5; we count active
 * sponsorships against that ceiling so the homepage / pulse page can render
 * accurate scarcity.
 *
 * Cached at the edge for 60 seconds — close enough to live for a 5-spot bucket
 * without hammering the DB on every landing render.
 */
const FOUNDING_TOTAL = 5

export async function GET() {
  try {
    const admin = createAdminClient()
    const { count, error } = await admin
      .from('sponsorships')
      .select('id', { count: 'exact', head: true })
      .eq('tier', 'mundial_pack_founding')
      .in('status', ['active', 'completed'])

    if (error) {
      console.error('[mundial-spots] count failed', error)
    }

    const taken = Math.min(FOUNDING_TOTAL, count ?? 0)
    const remaining = Math.max(0, FOUNDING_TOTAL - taken)

    return NextResponse.json(
      {
        founding_total: FOUNDING_TOTAL,
        founding_taken: taken,
        founding_remaining: remaining,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (err) {
    console.error('[mundial-spots]', err)
    return NextResponse.json(
      {
        founding_total: FOUNDING_TOTAL,
        founding_taken: 0,
        founding_remaining: FOUNDING_TOTAL,
      },
      { status: 200 }
    )
  }
}
