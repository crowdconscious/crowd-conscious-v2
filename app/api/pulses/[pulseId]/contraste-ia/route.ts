import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { createAdminClient } from '@/lib/supabase-admin'
import { loadContraste, viewerHasVoted } from '@/lib/contraste-ia/server'
import { canSeeContraste } from '@/lib/contraste-ia/visibility'

export const dynamic = 'force-dynamic'

/**
 * Contraste IA payload for one Pulse. Returns the prediction ONLY to admins,
 * to anyone once the Pulse is closed, or to a viewer with a vote on it
 * (session user, or ?guest_id= for guest voters). Otherwise 403 with no data.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ pulseId: string }> }) {
  const { pulseId } = await params
  const admin = createAdminClient()
  const { data: m } = await admin
    .from('prediction_markets')
    .select('id, is_pulse, is_draft, status, resolution_date')
    .eq('id', pulseId)
    .maybeSingle()
  if (!m || !m.is_pulse) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }
  const isAdmin = isAdminUser(user)
  if (m.is_draft && !isAdmin) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const closeMs = new Date(m.resolution_date as string).getTime()
  const isClosed = m.status === 'resolved' || m.status === 'closed' || (Number.isFinite(closeMs) && closeMs <= Date.now())
  const guestId = request.nextUrl.searchParams.get('guest_id')
  const hasVoted = isAdmin || isClosed ? true : await viewerHasVoted(admin, pulseId, { userId: user?.id, guestId })

  const headers = { 'Cache-Control': 'private, no-store' }
  if (!canSeeContraste({ isAdmin, isClosed, hasVoted })) {
    return NextResponse.json({ locked: true }, { status: 403, headers })
  }
  const data = await loadContraste(admin, pulseId)
  return NextResponse.json({ locked: false, data }, { headers })
}
