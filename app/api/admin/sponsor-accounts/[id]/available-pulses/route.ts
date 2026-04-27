import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-route-guard'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/sponsor-accounts/[id]/available-pulses?q=...
 *   → Pulse markets the admin can assign to this sponsor: unassigned markets
 *     plus any already assigned to this sponsor (to support idempotent UI).
 *     Drafts are intentionally INCLUDED so admins can stage sponsor +
 *     draft together before publishing.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { id } = await params
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''

  const admin = createAdminClient()

  let query = admin
    .from('prediction_markets')
    .select('id, title, status, is_draft, total_votes, sponsor_account_id, created_at')
    .eq('is_pulse', true)
    .or(`sponsor_account_id.is.null,sponsor_account_id.eq.${id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (q) {
    query = query.ilike('title', `%${q}%`)
  }

  const { data: markets, error } = await query
  if (error) {
    console.error('[admin/sponsor-accounts/:id/available-pulses GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ markets: markets ?? [] })
}
