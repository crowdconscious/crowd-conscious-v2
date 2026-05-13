import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { isAdminUser } from '@/lib/auth/is-admin'
import { SIGNAL_PUBLICATION_STATUSES } from '@/lib/i18n/citizen-signals'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin queue for Citizen Signals. Lists every signal regardless of
 * publication_status, with filters for the triage UI. Auth: admin only via
 * the shared `isAdminUser` helper (user_type === 'admin' OR ADMIN_EMAIL match).
 *
 * GET /api/admin/signals
 *   ?status=pending_review|needs_edit|published|...
 *   ?stage=0|1|2
 *   ?sort=newest|oldest|cosigns
 *   ?limit=1..200
 */

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 }
  const admin = createSignalsAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('user_type, email')
    .eq('id', user.id)
    .single()
  if (!isAdminUser(profile)) return { error: 'Admin only' as const, status: 403 }
  return { user, admin }
}

const listQuerySchema = z.object({
  status: z.enum(SIGNAL_PUBLICATION_STATUSES).optional(),
  stage: z.coerce.number().int().min(0).max(2).optional(),
  sort: z.enum(['newest', 'oldest', 'cosigns']).default('newest'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { admin } = auth

    const { searchParams } = new URL(request.url)
    const parsed = listQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      stage: searchParams.get('stage') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const q = parsed.data

    let query = admin
      .from('citizen_signals')
      .select(
        'id, public_slug, post_type, category, severity, target_kind, citizen_target_id, title, body, language, conscious_location_id, author_user_id, anonymous_display_mode, anonymous_display_name, publication_status, threshold_stage, cosign_count, canonical_duplicate_of, ai_scores, created_at, updated_at, edited_at'
      )
      .limit(q.limit)

    if (q.status) query = query.eq('publication_status', q.status)
    if (q.stage !== undefined) query = query.eq('threshold_stage', q.stage)

    switch (q.sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'cosigns':
        query = query
          .order('cosign_count', { ascending: false })
          .order('created_at', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    const { data, error } = await query
    if (error) {
      console.error('[api/admin/signals GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ signals: data ?? [] })
  } catch (err) {
    console.error('[api/admin/signals GET] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
