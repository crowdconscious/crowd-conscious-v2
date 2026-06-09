import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { isAdminUser } from '@/lib/auth/is-admin'
import {
  sendSignalFilerPublished,
  sendSignalFilerRejected,
  sendSignalFilerNeedsEdit,
} from '@/lib/resend'
import type { CitizenSignalsLocale } from '@/lib/i18n/citizen-signals'
import { runSignalsModerator } from '@/lib/agents/signals-moderator'
import { notifySignalPublished } from '@/lib/expo-push'

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
 *
 * POST /api/admin/signals/[id]
 *
 * Manually re-runs the F14 AI moderator for a single signal. Synchronous
 * (the admin is staring at the spinner). Returns the parsed
 * `SignalsModeratorOutput` and persists it to `citizen_signals.ai_scores`
 * + appends a fresh `ai_assessed` moderation event. Useful when the
 * initial fire-and-forget run errored or when prompt iteration is in
 * flight.
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
    // We also fetch title/language/author_user_id so we can fire the F13
    // transactional emails after the transition without a second roundtrip.
    const { data: row, error: rowErr } = await admin
      .from('citizen_signals')
      .select(
        'id, public_slug, publication_status, threshold_stage, title, language, author_user_id'
      )
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

    // F13: fire-and-forget filer notification when the row transitions to
    // a state the filer should hear about. We only email on the *first*
    // transition into each state (skip if the row was already in the
    // target state) so re-running the same action is idempotent. Failures
    // are logged but never affect the API response.
    const stateChanged = nextStatus !== row.publication_status
    if (
      stateChanged &&
      (nextStatus === 'published' ||
        nextStatus === 'rejected' ||
        nextStatus === 'needs_edit')
    ) {
      const locale: CitizenSignalsLocale =
        row.language === 'en' ? 'en' : 'es'
      const transitioned = nextStatus
      const reasonText = body.reason ?? null
      const needsEditMessage = body.needs_edit_message ?? null
      const signalSlug = row.public_slug
      const signalTitle = row.title
      const authorId = row.author_user_id

      void (async () => {
        try {
          const { data: profile } = await admin
            .from('profiles')
            .select('email, full_name')
            .eq('id', authorId)
            .maybeSingle()
          const recipient = profile?.email
          if (!recipient) return
          const filerName = profile?.full_name ?? null

          if (transitioned === 'published') {
            await sendSignalFilerPublished({
              to: recipient,
              locale,
              signalSlug,
              signalTitle,
              filerName,
            })
          } else if (transitioned === 'rejected') {
            await sendSignalFilerRejected({
              to: recipient,
              locale,
              signalSlug,
              signalTitle,
              filerName,
              reason: reasonText,
            })
          } else if (transitioned === 'needs_edit') {
            // Fall back to a neutral note if the admin forgot to include
            // a `needs_edit_message`. The helper otherwise returns
            // ok=false with 'missing_moderator_note' and the filer would
            // never see anything.
            const note =
              needsEditMessage && needsEditMessage.trim().length > 0
                ? needsEditMessage
                : locale === 'es'
                  ? 'Un moderador pidió ajustes en tu señal. Abre el envío para ver los detalles.'
                  : 'A moderator requested edits on your signal. Open the submission for details.'
            await sendSignalFilerNeedsEdit({
              to: recipient,
              locale,
              signalSlug,
              signalTitle,
              filerName,
              moderatorNote: note,
            })
          }
        } catch (e) {
          console.error('[api/admin/signals PATCH] filer email', e)
        }
      })()
    }

    if (
      stateChanged &&
      nextStatus === 'published' &&
      row.publication_status !== 'published'
    ) {
      try {
        await notifySignalPublished(admin, {
          slug: row.public_slug,
          title: row.title,
          excludeUserId: row.author_user_id,
        })
      } catch (err) {
        console.warn('[api/admin/signals PATCH] cosign push error:', err)
      }
    }

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

const postSchema = z.object({
  action: z.literal('rerun_ai'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

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

    const result = await runSignalsModerator(signalId)
    return NextResponse.json({ ai_scores: result })
  } catch (err) {
    console.error('[api/admin/signals POST] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
