import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { mintSignalSlug } from '@/lib/signals/slug'
import {
  SIGNAL_CATEGORIES,
  SIGNAL_POST_TYPES,
  SIGNAL_SEVERITIES,
  SIGNAL_TARGET_KINDS,
} from '@/lib/i18n/citizen-signals'
import {
  lenientRateLimit,
  moderateRateLimit,
  getRateLimitIdentifier,
} from '@/lib/rate-limit'
import { sendSignalFilerReceived } from '@/lib/resend'
import { enqueueSignalsModerator } from '@/lib/agents/signals-moderator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Citizen Signals — public feed (GET) and create (POST).
 *
 * The route is feature-flagged on SIGNALS_ENABLED. When disabled it returns
 * 404 on both verbs so legacy share links can be reactivated later without
 * surfacing the surface mid-development.
 *
 * GET reads from `citizen_signals_public` — an anon-safe view that strips
 * author_user_id and ai_scores. POST writes through the service-role
 * admin client (bypasses RLS) after `getCurrentUser()` confirms the caller
 * is signed in.
 */

function flagOn() {
  return process.env.SIGNALS_ENABLED === 'true'
}

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// =============================================================================
// GET /api/signals
// =============================================================================

const listQuerySchema = z.object({
  category: z.enum(SIGNAL_CATEGORIES).optional(),
  severity: z.enum(SIGNAL_SEVERITIES).optional(),
  target_kind: z.enum(SIGNAL_TARGET_KINDS).optional(),
  stage: z.coerce.number().int().min(0).max(2).optional(),
  location: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  if (!flagOn()) return notFound()

  try {
    if (lenientRateLimit) {
      const id = await getRateLimitIdentifier(request)
      const rate = await lenientRateLimit.limit(`signals-list:${id}`)
      if (!rate.success) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
      }
    }

    const { searchParams } = new URL(request.url)
    const parsed = listQuerySchema.safeParse({
      category: searchParams.get('category') ?? undefined,
      severity: searchParams.get('severity') ?? undefined,
      target_kind: searchParams.get('target_kind') ?? undefined,
      stage: searchParams.get('stage') ?? undefined,
      location: searchParams.get('location') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const q = parsed.data

    const admin = createSignalsAdminClient()
    let query = admin
      .from('citizen_signals_public')
      .select(
        'id, public_slug, post_type, category, severity, target_kind, citizen_target_id, title, body, language, conscious_location_id, anonymous_display_mode, display_name, threshold_stage, cosign_count, stage1_met_at, stage2_met_at, created_at, updated_at'
      )
      .order('created_at', { ascending: false })
      .limit(q.limit)

    if (q.category) query = query.eq('category', q.category)
    if (q.severity) query = query.eq('severity', q.severity)
    if (q.target_kind) query = query.eq('target_kind', q.target_kind)
    if (q.stage !== undefined) query = query.eq('threshold_stage', q.stage)
    if (q.location) query = query.eq('conscious_location_id', q.location)
    if (q.cursor) query = query.lt('created_at', q.cursor)

    const { data, error } = await query
    if (error) {
      console.error('[api/signals GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []
    const nextCursor =
      rows.length === q.limit ? rows[rows.length - 1].created_at : null

    return NextResponse.json({ signals: rows, nextCursor })
  } catch (err) {
    console.error('[api/signals GET] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// =============================================================================
// POST /api/signals  — authenticated create
// =============================================================================

const createBodySchema = z.object({
  post_type: z.enum(SIGNAL_POST_TYPES),
  category: z.enum(SIGNAL_CATEGORIES),
  severity: z.enum(SIGNAL_SEVERITIES),
  target_kind: z.enum(SIGNAL_TARGET_KINDS),
  citizen_target_id: z.string().uuid(),
  title: z.string().trim().min(8).max(160),
  body: z.string().trim().min(20).max(8000),
  language: z.enum(['es', 'en']),
  conscious_location_id: z.string().uuid(),
  anonymous_display_mode: z.boolean().optional().default(false),
  anonymous_display_name: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .optional()
    .nullable(),
  evidence: z
    .array(
      z.object({
        kind: z.enum(['image', 'pdf', 'link']),
        storage_path: z.string().trim().min(1).max(1024).optional().nullable(),
        external_url: z.string().trim().url().max(2000).optional().nullable(),
        caption: z.string().trim().max(500).optional().nullable(),
      })
    )
    .max(5)
    .optional()
    .default([]),
})

export async function POST(request: NextRequest) {
  if (!flagOn()) return notFound()

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (moderateRateLimit) {
      const id = await getRateLimitIdentifier(request, user.id)
      const rate = await moderateRateLimit.limit(`signals-create:${id}`)
      if (!rate.success) {
        return NextResponse.json(
          { error: 'Too many submissions, try again in a minute' },
          { status: 429 }
        )
      }
    }

    const json = await request.json().catch(() => null)
    const parsed = createBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const payload = parsed.data

    // Belt-and-suspenders evidence validation: exactly one source per row.
    for (const ev of payload.evidence) {
      const hasPath = !!ev.storage_path
      const hasUrl = !!ev.external_url
      if (hasPath === hasUrl) {
        return NextResponse.json(
          {
            error:
              'Each evidence item must have exactly one of storage_path or external_url',
          },
          { status: 400 }
        )
      }
      if (ev.kind === 'link' && !hasUrl) {
        return NextResponse.json(
          { error: 'kind=link requires external_url' },
          { status: 400 }
        )
      }
      if ((ev.kind === 'image' || ev.kind === 'pdf') && !hasPath) {
        return NextResponse.json(
          { error: `kind=${ev.kind} requires storage_path` },
          { status: 400 }
        )
      }
    }

    if (payload.anonymous_display_mode && !payload.anonymous_display_name) {
      return NextResponse.json(
        {
          error: 'anonymous_display_name is required when anonymous_display_mode=true',
        },
        { status: 400 }
      )
    }

    const admin = createSignalsAdminClient()

    // Pilot geography gate: the conscious_locations row must live in CDMX.
    // We accept any active CDMX row; the SIGNALS_ALLOWED_LOCATION_IDS env
    // var (optional) can narrow it further once we know the pilot polygon.
    const allowedIdsRaw = process.env.SIGNALS_ALLOWED_LOCATION_IDS?.trim()
    const allowedIds = allowedIdsRaw
      ? allowedIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : null

    if (allowedIds && !allowedIds.includes(payload.conscious_location_id)) {
      return NextResponse.json(
        { error: 'Location is not in the Signals pilot allow-list' },
        { status: 400 }
      )
    }

    const { data: location, error: locErr } = await admin
      .from('conscious_locations')
      .select('id, city, status')
      .eq('id', payload.conscious_location_id)
      .maybeSingle()

    if (locErr) {
      console.error('[api/signals POST] location lookup', locErr)
      return NextResponse.json({ error: 'Location check failed' }, { status: 500 })
    }
    if (!location) {
      return NextResponse.json({ error: 'Unknown location' }, { status: 400 })
    }
    if (location.status !== 'active') {
      return NextResponse.json({ error: 'Location is not active' }, { status: 400 })
    }
    if (!allowedIds) {
      // No explicit allow-list — enforce city = Ciudad de México (case-insensitive).
      const city = (location.city ?? '').toLowerCase().trim()
      const isCdmx =
        city === 'ciudad de méxico' ||
        city === 'ciudad de mexico' ||
        city === 'cdmx'
      if (!isCdmx) {
        return NextResponse.json(
          { error: 'MVP pilot is CDMX-only' },
          { status: 400 }
        )
      }
    }

    // Target sanity-check: target_kind on the signal must match the target row.
    const { data: target, error: tErr } = await admin
      .from('citizen_targets')
      .select('id, target_kind')
      .eq('id', payload.citizen_target_id)
      .maybeSingle()
    if (tErr) {
      console.error('[api/signals POST] target lookup', tErr)
      return NextResponse.json({ error: 'Target check failed' }, { status: 500 })
    }
    if (!target) {
      return NextResponse.json({ error: 'Unknown target' }, { status: 400 })
    }
    if (target.target_kind !== payload.target_kind) {
      return NextResponse.json(
        { error: 'target_kind mismatch with citizen_targets row' },
        { status: 400 }
      )
    }

    const slug = mintSignalSlug(payload.title)

    const { data: insertedSignal, error: insertErr } = await admin
      .from('citizen_signals')
      .insert({
        public_slug: slug,
        post_type: payload.post_type,
        category: payload.category,
        severity: payload.severity,
        target_kind: payload.target_kind,
        citizen_target_id: payload.citizen_target_id,
        title: payload.title,
        body: payload.body,
        language: payload.language,
        conscious_location_id: payload.conscious_location_id,
        author_user_id: user.id,
        anonymous_display_mode: payload.anonymous_display_mode ?? false,
        anonymous_display_name: payload.anonymous_display_name ?? null,
        publication_status: 'pending_review',
      })
      .select('id, public_slug')
      .single()

    if (insertErr || !insertedSignal) {
      console.error('[api/signals POST] insert signal', insertErr)
      return NextResponse.json(
        { error: insertErr?.message ?? 'Insert failed' },
        { status: 500 }
      )
    }

    // Attach evidence rows (best-effort: if a single row fails we still
    // return success for the signal so the user does not lose their work).
    if (payload.evidence.length > 0) {
      const evidenceRows = payload.evidence.map((ev) => ({
        signal_id: insertedSignal.id,
        kind: ev.kind,
        storage_path: ev.storage_path ?? null,
        external_url: ev.external_url ?? null,
        caption: ev.caption ?? null,
        visibility: 'moderators_only' as const,
      }))
      const { error: evErr } = await admin
        .from('citizen_signal_evidence')
        .insert(evidenceRows)
      if (evErr) {
        console.error('[api/signals POST] insert evidence', evErr)
      }
    }

    // Append moderation event: submitted.
    await admin.from('citizen_signal_moderation_events').insert({
      signal_id: insertedSignal.id,
      admin_user_id: user.id, // submitter recorded; admin override on approve
      action: 'submitted',
      detail: { source: 'api/signals POST' },
    })

    // F14: fire-and-forget AI moderator. Runs after the response is
    // flushed (via Next 15 `after()`), populates `ai_scores`, appends an
    // `ai_assessed` moderation event. Must NEVER block this POST.
    enqueueSignalsModerator(insertedSignal.id)

    // F13: fire-and-forget filer "received" email. We look up
    // profiles.email (NOT auth.users) because every signed-in user
    // already has a profile row created by the auth trigger. Email
    // failures are logged but do NOT affect the API response so a Resend
    // outage does not 500 the submission flow.
    void (async () => {
      try {
        const { data: profile } = await admin
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .maybeSingle()
        const recipient = profile?.email
        if (!recipient) return
        await sendSignalFilerReceived({
          to: recipient,
          locale: payload.language,
          signalSlug: insertedSignal.public_slug,
          signalTitle: payload.title,
          filerName: profile?.full_name ?? null,
        })
      } catch (e) {
        console.error('[api/signals POST] filer-received email', e)
      }
    })()

    return NextResponse.json(
      {
        slug: insertedSignal.public_slug,
        id: insertedSignal.id,
        status: 'pending_review',
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[api/signals POST] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
