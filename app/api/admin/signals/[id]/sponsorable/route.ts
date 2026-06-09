import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdminUser } from '@/lib/auth/is-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin-only toggle for citizen_signals.sponsorable (Prompt 5).
 *
 * PATCH /api/admin/signals/[id]/sponsorable  { sponsorable: boolean }
 *
 * Only the `sponsorable` eligibility flag is writable here — this endpoint
 * NEVER touches signal content, status, thresholds or co-firma counts. Writes
 * go through the service-role client (bypasses RLS; the DB trigger
 * `enforce_signal_sponsorable_admin_only` separately allows service_role), and
 * we still gate the caller with the app-level admin policy.
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

const patchSchema = z.object({
  sponsorable: z.boolean(),
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
    const { user } = auth
    // The `sponsorable` column is not yet modelled in types/database.ts, so use
    // the untyped service-role client for the citizen_signals read/write.
    const admin = createAdminClient()

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

    const { data: row, error: rowErr } = await admin
      .from('citizen_signals')
      .select('id, sponsorable')
      .eq('id', signalId)
      .maybeSingle()
    if (rowErr) {
      console.error('[api/admin/signals/sponsorable PATCH] read', rowErr)
      return NextResponse.json({ error: rowErr.message }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error: updErr } = await admin
      .from('citizen_signals')
      .update({
        sponsorable: parsed.data.sponsorable,
        updated_at: new Date().toISOString(),
      })
      .eq('id', signalId)
    if (updErr) {
      console.error('[api/admin/signals/sponsorable PATCH] update', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Audit trail — reuse the moderation events log so the change is visible
    // alongside other admin actions on the signal.
    await admin.from('citizen_signal_moderation_events').insert({
      signal_id: signalId,
      admin_user_id: user.id,
      action: 'set_sponsorable',
      detail: {
        from: row.sponsorable ?? false,
        to: parsed.data.sponsorable,
      },
    })

    return NextResponse.json({
      id: signalId,
      sponsorable: parsed.data.sponsorable,
    })
  } catch (err) {
    console.error('[api/admin/signals/sponsorable PATCH] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
