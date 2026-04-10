import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/** Mark sponsor onboarding as seen (sets last_dashboard_visit). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const admin = createAdminClient()

    const { data: account, error: accErr } = await admin
      .from('sponsor_accounts')
      .select('id')
      .eq('access_token', token)
      .eq('status', 'active')
      .maybeSingle()

    if (accErr || !account) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    const { error: upErr } = await admin
      .from('sponsor_accounts')
      .update({ last_dashboard_visit: new Date().toISOString() })
      .eq('id', account.id)

    if (upErr) {
      console.error('[sponsor onboarding]', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
