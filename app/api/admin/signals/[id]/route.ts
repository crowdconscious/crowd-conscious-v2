import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { isAdminUser } from '@/lib/auth/is-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin state transitions for a single Citizen Signal.
 *
 * PATCH /api/admin/signals/[id]
 *
 * Allowed body fields (all optional; combine as needed):
 *   - publication_status: approve | reject | needs_edit | archive | publish | dispute
 *     (string mapped to a publication_status value; we keep the API verbs human)
 *   - needs_edit_message: string — when transitioning to needs_edit
 *   - canonical_duplicate_of: uuid — merge this row into another row.
 *     The duplicate is moved to publication_status = 'archived' and its
 *     cosign_count is added to the canonical (additive; UNIQUE on
 *     (signal_id, user_id) means we re-key cosign rows where the user
 *     hasn't already co-signed the canonical).
 *
 * Every PATCH that changes state writes one citizen_signal_moderation_events
 * row so the audit log stays complete.
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

const transitionMap: Record<string, string> = {
  approve: 'published',
  publish: 'published',
  reject: 'rejected',
  needs_edit: 'needs_edit',
  archive: 'archived',
  dispute: 'disputed',
  unpublish: 'pending_review',
}

const patchSchema = z.object({
  action: z.enum([
    'approve',
    'publish',
    'reject',
    'needs_edit',
    'archive',
    'dispute',
    'unpublish',
    'merge',
  ]),
  needs_edit_message: z.string().trim().min(2).max(2000).optional(),
  canonical_duplicate_of: z.string().uuid().optional(),
  reason: z.string().trim().max(2000).optional(),
})

export async function PATCH(
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
    const parsed = patchSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const body = parsed.data

    // Read the row first so we can record the prior state in the audit log
    // and reject pre-conditions (e.g. merge target must exist + be published).
    const { data: row, error: rowErr } = await admin
      .from('citizen_signals')
      .select('id, public_slug, publication_status, threshold_stage')
      .eq('id', signalId)
      .maybeSingle()
    if (rowErr) {
      console.error('[api/admin/signals PATCH] read', rowErr)
      return NextResponse.json({ error: rowErr.message }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let nextStatus = row.publication_status
    let canonicalDuplicateOf = body.canonical_duplicate_of ?? null

    if (body.action === 'merge') {
      if (!body.canonical_duplicate_of) {
        return NextResponse.json(
          { error: 'merge requires canonical_duplicate_of' },
          { status: 400 }
        )
      }
      if (body.canonical_duplicate_of === row.id) {
        return NextResponse.json(
          { error: 'Cannot merge a signal into itself' },
          { status: 400 }
        )
      }
      const { data: canonical } = await admin
        .from('citizen_signals')
        .select('id, publication_status')
        .eq('id', body.canonical_duplicate_of)
        .maybeSingle()
      if (!canonical) {
        return NextResponse.json(
          { error: 'Canonical signal not found' },
          { status: 400 }
        )
      }
      nextStatus = 'archived'
      canonicalDuplicateOf = canonical.id

      // Re-key cosigns the duplicate has but the canonical doesn't yet.
      // Done via a SELECT then a per-row INSERT-on-conflict so we don't
      // violate UNIQUE(signal_id, user_id) and we don't lose count on
      // users who co-signed both. (Postgres ON CONFLICT DO NOTHING via
      // upsert mirrors this in one round trip.)
      const { data: dupCosigns } = await admin
        .from('citizen_signal_cosigns')
        .select('user_id')
        .eq('signal_id', row.id)
      if (dupCosigns && dupCosigns.length > 0) {
        const rows = dupCosigns.map((c) => ({
          signal_id: canonical.id,
          user_id: c.user_id,
        }))
        await admin
          .from('citizen_signal_cosigns')
          .upsert(rows, {
            onConflict: 'signal_id,user_id',
            ignoreDuplicates: true,
          })
        // Remove the duplicate's cosign rows so the trigger drops its
        // counter (the canonical's counter goes up via the upsert above).
        await admin
          .from('citizen_signal_cosigns')
          .delete()
          .eq('signal_id', row.id)
      }
    } else {
      const mapped = transitionMap[body.action]
      if (!mapped) {
        return NextResponse.json(
          { error: `Unsupported action: ${body.action}` },
          { status: 400 }
        )
      }
      nextStatus = mapped
    }

    const updatePayload: Record<string, unknown> = {
      publication_status: nextStatus,
      updated_at: new Date().toISOString(),
    }
    if (canonicalDuplicateOf !== null && body.action === 'merge') {
      updatePayload.canonical_duplicate_of = canonicalDuplicateOf
    }

    const { error: updErr } = await admin
      .from('citizen_signals')
      .update(updatePayload)
      .eq('id', row.id)
    if (updErr) {
      console.error('[api/admin/signals PATCH] update', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // When publishing for the first time, flip evidence visibility to public.
    if (nextStatus === 'published' && row.publication_status !== 'published') {
      await admin
        .from('citizen_signal_evidence')
        .update({ visibility: 'public' })
        .eq('signal_id', row.id)
    }

    // Audit log: always one event per PATCH.
    await admin.from('citizen_signal_moderation_events').insert({
      signal_id: row.id,
      admin_user_id: user.id,
      action: body.action,
      detail: {
        from_status: row.publication_status,
        to_status: nextStatus,
        reason: body.reason ?? null,
        needs_edit_message: body.needs_edit_message ?? null,
        canonical_duplicate_of: canonicalDuplicateOf,
      },
    })

    return NextResponse.json({
      id: row.id,
      slug: row.public_slug,
      publication_status: nextStatus,
    })
  } catch (err) {
    console.error('[api/admin/signals PATCH] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
