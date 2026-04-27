import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-route-guard'

export const dynamic = 'force-dynamic'

/**
 * GET  /api/admin/sponsor-accounts/[id]/markets
 *   → Pulses currently assigned to this sponsor.
 * POST /api/admin/sponsor-accounts/[id]/markets   { market_id }
 *   → Assign a Pulse market to this sponsor (1:1; rejects if already taken
 *     by a different sponsor).
 */

const PULSE_SELECT =
  'id, title, status, is_pulse, is_draft, total_votes, sponsor_account_id, created_at'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id } = await params
  const admin = createAdminClient()

  const { data: markets, error } = await admin
    .from('prediction_markets')
    .select(PULSE_SELECT)
    .eq('sponsor_account_id', id)
    .eq('is_pulse', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/sponsor-accounts/:id/markets GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ markets: markets ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id } = await params

  let body: { market_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const marketId = body.market_id?.trim()
  if (!marketId) {
    return NextResponse.json({ error: 'market_id is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Make sure the sponsor exists before we mutate prediction_markets so we
  // return a clean 404 instead of an FK violation.
  const { data: sponsor, error: sErr } = await admin
    .from('sponsor_accounts')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (sErr) {
    console.error('[admin/sponsor-accounts/:id/markets POST] sponsor', sErr)
    return NextResponse.json({ error: sErr.message }, { status: 500 })
  }
  if (!sponsor) {
    return NextResponse.json({ error: 'Sponsor not found' }, { status: 404 })
  }

  const { data: market, error: mErr } = await admin
    .from('prediction_markets')
    .select('id, is_pulse, sponsor_account_id')
    .eq('id', marketId)
    .maybeSingle()
  if (mErr) {
    console.error('[admin/sponsor-accounts/:id/markets POST] market', mErr)
    return NextResponse.json({ error: mErr.message }, { status: 500 })
  }
  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }
  if (!market.is_pulse) {
    return NextResponse.json(
      { error: 'Only Pulse markets can be assigned to a sponsor' },
      { status: 400 }
    )
  }
  if (market.sponsor_account_id && market.sponsor_account_id !== id) {
    return NextResponse.json(
      {
        error:
          'Market is already assigned to a different sponsor. Unassign it from the other sponsor first.',
      },
      { status: 409 }
    )
  }

  const { data: updated, error: upErr } = await admin
    .from('prediction_markets')
    .update({ sponsor_account_id: id })
    .eq('id', marketId)
    .select(PULSE_SELECT)
    .maybeSingle()

  if (upErr) {
    console.error('[admin/sponsor-accounts/:id/markets POST] update', upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  return NextResponse.json({ market: updated })
}
