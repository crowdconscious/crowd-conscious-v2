import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-route-guard'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/sponsor-accounts/[id]/markets/[marketId]
 *   → Unassign a Pulse market from this sponsor (sets sponsor_account_id NULL).
 *     No-op if the market is currently assigned to a different sponsor.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; marketId: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id, marketId } = await params
  const admin = createAdminClient()

  const { data: market, error: mErr } = await admin
    .from('prediction_markets')
    .select('id, sponsor_account_id')
    .eq('id', marketId)
    .maybeSingle()
  if (mErr) {
    console.error('[admin/sponsor-accounts/:id/markets/:marketId DELETE] read', mErr)
    return NextResponse.json({ error: mErr.message }, { status: 500 })
  }
  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }
  if (market.sponsor_account_id && market.sponsor_account_id !== id) {
    return NextResponse.json(
      { error: 'Market is assigned to a different sponsor' },
      { status: 409 }
    )
  }

  const { error: upErr } = await admin
    .from('prediction_markets')
    .update({ sponsor_account_id: null })
    .eq('id', marketId)

  if (upErr) {
    console.error('[admin/sponsor-accounts/:id/markets/:marketId DELETE] update', upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
