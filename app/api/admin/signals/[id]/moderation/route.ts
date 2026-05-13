import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { isAdminUser } from '@/lib/auth/is-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Moderation log surface for a single Citizen Signal.
 *
 * GET  /api/admin/signals/[id]/moderation — read the append-only audit log.
 * POST /api/admin/signals/[id]/moderation — append a note (free-form action
 *      label + detail) without changing publication_status.
 *
 * State-changing transitions live on PATCH /api/admin/signals/[id] which
 * writes its own moderation event. This endpoint is for free-form notes
 * (e.g. "left voicemail with target", "user contacted us via email").
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

const postSchema = z.object({
  action: z.string().trim().min(2).max(64),
  detail: z.record(z.string(), z.unknown()).optional().default({}),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { admin } = auth

    const { id: signalId } = await params
    if (!z.string().uuid().safeParse(signalId).success) {
      return NextResponse.json({ error: 'Bad id' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('citizen_signal_moderation_events')
      .select('id, admin_user_id, action, detail, created_at')
      .eq('signal_id', signalId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('[api/admin/signals/moderation GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ events: data ?? [] })
  } catch (err) {
    console.error('[api/admin/signals/moderation GET] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { user, admin } = auth

    const { id: signalId } = await params
    if (!z.string().uuid().safeParse(signalId).success) {
      return NextResponse.json({ error: 'Bad id' }, { status: 400 })
    }

    const json = await request.json().catch(() => null)
    const parsed = postSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Confirm the signal exists so we don't accumulate orphan log rows.
    const { data: signal } = await admin
      .from('citizen_signals')
      .select('id')
      .eq('id', signalId)
      .maybeSingle()
    if (!signal) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Cast detail through unknown so Postgrest's Json union type accepts
    // a plain object (TS otherwise rejects Record<string, unknown> because
    // the Json union excludes arbitrary object types).
    const detailJson = (parsed.data.detail ?? {}) as unknown as Record<string, never>

    const { data: inserted, error } = await admin
      .from('citizen_signal_moderation_events')
      .insert({
        signal_id: signal.id,
        admin_user_id: user.id,
        action: parsed.data.action,
        detail: detailJson,
      })
      .select('id, action, detail, created_at')
      .single()

    if (error || !inserted) {
      console.error('[api/admin/signals/moderation POST]', error)
      return NextResponse.json(
        { error: error?.message ?? 'Insert failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    console.error('[api/admin/signals/moderation POST] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
