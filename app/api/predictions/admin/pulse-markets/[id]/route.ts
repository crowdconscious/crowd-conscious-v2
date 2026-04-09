import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

/** Full Pulse market + outcomes + votes for admin blog embed preview. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('user_type').eq('id', user.id).single()
    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id } = await context.params

    const { data: market, error } = await admin
      .from('prediction_markets')
      .select(
        `
        id,
        title,
        description,
        translations,
        status,
        resolution_date,
        is_pulse,
        market_outcomes ( id, label, probability, sort_order, translations ),
        market_votes ( id, confidence, outcome_id, created_at, user_id, anonymous_participant_id, reasoning )
      `
      )
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[pulse-markets id GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!market || !market.is_pulse) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ market })
  } catch (e) {
    console.error('[pulse-markets id GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
