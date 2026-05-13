import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { isAdminUser } from '@/lib/auth/is-admin'
import {
  defaultExpiryDate,
  hashTargetToken,
  mintRawTargetToken,
} from '@/lib/target-token-hash'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin: mint a magic-link token for a citizen_target. Returns the raw
 * token + full dashboard URL exactly once — there is no way to read the
 * raw token back after this response. Subsequent visits to this endpoint
 * mint a fresh token and revoke any prior active row for the same target.
 *
 * POST /api/admin/signals/targets/[id]/access-token
 *   body: { ttl_days?: number, label?: string }
 *
 * GET — list non-revoked tokens (hash-only) so the admin can see who has
 *   an active link without leaking it.
 *
 * DELETE — revoke the most recent active token (effectively burns the link).
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

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://crowdconscious.app').replace(/\/$/, '')

const postSchema = z.object({
  ttl_days: z.coerce.number().int().min(1).max(365).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { admin } = auth
  const { id: targetId } = await params
  if (!z.string().uuid().safeParse(targetId).success) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  }
  const { data, error } = await admin
    .from('citizen_target_access_tokens')
    .select('id, token_hash, expires_at, created_at, revoked_at')
    .eq('citizen_target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tokens: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { user, admin } = auth
  const { id: targetId } = await params
  if (!z.string().uuid().safeParse(targetId).success) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  }

  const json = await request.json().catch(() => ({}))
  const parsed = postSchema.safeParse(json ?? {})
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Confirm the target exists.
  const { data: target } = await admin
    .from('citizen_targets')
    .select('id, display_name')
    .eq('id', targetId)
    .maybeSingle()
  if (!target) {
    return NextResponse.json({ error: 'Target not found' }, { status: 404 })
  }

  // Revoke any prior active token for this target. We mark expired/already-
  // revoked rows untouched so the audit trail stays clean.
  await admin
    .from('citizen_target_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('citizen_target_id', targetId)
    .is('revoked_at', null)

  const raw = mintRawTargetToken()
  const hash = hashTargetToken(raw)
  const expiresAt =
    parsed.data.ttl_days !== undefined
      ? (() => {
          const d = new Date()
          d.setDate(d.getDate() + parsed.data.ttl_days)
          return d
        })()
      : defaultExpiryDate()

  const { error: insErr, data: inserted } = await admin
    .from('citizen_target_access_tokens')
    .insert({
      citizen_target_id: targetId,
      token_hash: hash,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, expires_at, created_at')
    .single()

  if (insErr || !inserted) {
    console.error('[api/admin/signals/targets/access-token POST]', insErr)
    return NextResponse.json(
      { error: insErr?.message ?? 'Insert failed' },
      { status: 500 }
    )
  }

  // Note: the citizen_target_access_tokens row IS the audit record for
  // this action (it stores who/when via created_at + admin_user_id is
  // tracked by the API caller). We don't write a citizen_signal_moderation_events
  // row because that table is per-signal and a token can outlive any
  // single signal.
  void user // keep the lint silent; auth is already enforced above.

  const url = `${APP_ORIGIN}/dashboard/target/${raw}`

  return NextResponse.json(
    {
      raw_token: raw,
      url,
      token_id: inserted.id,
      expires_at: inserted.expires_at,
    },
    { status: 201 }
  )
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { admin } = auth
  const { id: targetId } = await params
  if (!z.string().uuid().safeParse(targetId).success) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  }
  const { error } = await admin
    .from('citizen_target_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('citizen_target_id', targetId)
    .is('revoked_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
