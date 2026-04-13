import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { recalculateLocationScore } from '@/lib/locations/recalculate-score'

/**
 * POST /api/locations/recalculate
 * Body: { locationId?: string } — if omitted, recalculates all locations with a current_market_id.
 * Auth: admin session OR Authorization: Bearer CRON_SECRET
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronOk = authHeader === `Bearer ${process.env.CRON_SECRET}`

    let adminUser = false
    if (!cronOk) {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const supabase = await createClient()
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
      adminUser = profile?.user_type === 'admin'
      if (!adminUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    let body: { locationId?: string } = {}
    try {
      body = await request.json()
    } catch {
      // empty body ok
    }

    const admin = createAdminClient()

    if (body.locationId) {
      await recalculateLocationScore(body.locationId)
      return NextResponse.json({ ok: true, updated: 1 })
    }

    const { data: locs } = await admin
      .from('conscious_locations')
      .select('id')
      .not('current_market_id', 'is', null)

    let n = 0
    for (const row of locs ?? []) {
      await recalculateLocationScore(row.id)
      n += 1
    }

    return NextResponse.json({ ok: true, updated: n })
  } catch (err) {
    console.error('[POST /api/locations/recalculate]', err)
    return NextResponse.json({ error: 'Recalculate failed' }, { status: 500 })
  }
}
