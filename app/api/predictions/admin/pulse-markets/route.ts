import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

/** Pulse markets for blog admin dropdown: title, vote count, status. */
export async function GET() {
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

    const { data: markets, error } = await admin
      .from('prediction_markets')
      .select('id, title, status, total_votes, engagement_count')
      .eq('is_pulse', true)
      .order('resolution_date', { ascending: false })

    if (error) {
      console.error('[pulse-markets GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ markets: markets ?? [] })
  } catch (e) {
    console.error('[pulse-markets GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
