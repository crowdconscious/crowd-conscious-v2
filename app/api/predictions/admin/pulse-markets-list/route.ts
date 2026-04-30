import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin-only list of Pulse markets used by the agents dashboard picker
 * (so the founder doesn't have to memorise / paste UUIDs). Returns
 * everything tagged is_pulse=true, ordered most-recent first, with a
 * lightweight sponsor label so the dropdown is readable. Drafts and
 * resolved Pulses are both included — admins may want to (re)generate
 * a report for either.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('prediction_markets')
    .select(
      'id, title, status, is_draft, total_votes, sponsor_account_id, sponsor_name, pulse_client_email, resolution_date, created_at'
    )
    .eq('is_pulse', true)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    markets: (data ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      isDraft: !!m.is_draft,
      totalVotes: m.total_votes ?? 0,
      sponsorName: m.sponsor_name ?? null,
      sponsorAccountId: m.sponsor_account_id ?? null,
      pulseClientEmail: m.pulse_client_email ?? null,
      resolutionDate: m.resolution_date ?? null,
      createdAt: m.created_at,
    })),
  })
}
