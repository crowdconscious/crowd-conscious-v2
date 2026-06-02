import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUserFromRequest } from '@/lib/auth-server'
import {
  firstSignalContentPolicyViolation,
  observationPayloadHasForbiddenRoutedFields,
} from '@/lib/contentPolicy'
import {
  createSignalBodySchema,
  normalizeLocality,
  normalizeStreetReference,
  validateSignalEvidence,
  type ObservationCreateBody,
  type RoutedCreateBody,
} from '@/lib/signals/create-signal-schema'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { mintSignalSlug } from '@/lib/signals/slug'
import {
  SIGNAL_CATEGORIES,
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
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

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
 * admin client (bypasses RLS) after `getCurrentUserFromRequest()` confirms
 * the caller is signed in (cookie session OR Authorization: Bearer JWT
 * for the mobile app).
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
        'id, public_slug, post_type, category, severity, target_kind, citizen_target_id, title, body, language, conscious_location_id, partner_location_id, street_reference, anonymous_display_mode, display_name, threshold_stage, cosign_count, anonymous_support_count, stage1_met_at, stage2_met_at, created_at, updated_at'
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

type SignalsAdminClient = SupabaseClient<Database>

/** Post-B1 geography insert shape; regenerate database.ts when convenient. */
type CitizenSignalGeographyInsert = {
  public_slug: string
  routing_mode: 'routed' | 'observation'
  country_code: string
  city_slug: string
  locality: string | null
  post_type: string
  category: string
  severity: string
  target_kind: string | null
  citizen_target_id: string | null
  title: string
  body: string
  language: string
  conscious_location_id: string | null
  partner_location_id: string | null
  street_reference: string | null
  author_user_id: string
  anonymous_display_mode: boolean
  anonymous_display_name: string | null
  publication_status: 'pending_review'
}

async function validateRoutedGeographyAndTarget(
  admin: SignalsAdminClient,
  payload: RoutedCreateBody
): Promise<
  | { ok: true; partnerLocationId: string | null; streetReference: string | null }
  | { ok: false; status: number; error: string }
> {
  const partnerLocationId = payload.partner_location_id ?? null
  const streetNorm = normalizeStreetReference(payload.street_reference)
  if (streetNorm.error) {
    return { ok: false, status: 400, error: streetNorm.error }
  }
  const streetReference = streetNorm.value

  if (partnerLocationId && streetReference) {
    return {
      ok: false,
      status: 400,
      error: 'Choose either a partner location or a street reference, not both',
    }
  }

  const allowedIdsRaw = process.env.SIGNALS_ALLOWED_LOCATION_IDS?.trim()
  const allowedIds = allowedIdsRaw
    ? allowedIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : null

  if (allowedIds && !allowedIds.includes(payload.conscious_location_id)) {
    return {
      ok: false,
      status: 400,
      error: 'Location is not in the Signals pilot allow-list',
    }
  }

  const { data: location, error: locErr } = await admin
    .from('conscious_locations')
    .select('id, city, status')
    .eq('id', payload.conscious_location_id)
    .maybeSingle()

  if (locErr) {
    console.error('[api/signals POST] location lookup', locErr)
    return { ok: false, status: 500, error: 'Location check failed' }
  }
  if (!location) {
    return { ok: false, status: 400, error: 'Unknown location' }
  }
  if (location.status !== 'active') {
    return { ok: false, status: 400, error: 'Location is not active' }
  }
  if (!allowedIds) {
    const city = (location.city ?? '').toLowerCase().trim()
    const isCdmx =
      city === 'ciudad de méxico' ||
      city === 'ciudad de mexico' ||
      city === 'cdmx'
    if (!isCdmx) {
      return { ok: false, status: 400, error: 'MVP pilot is CDMX-only' }
    }
  }

  if (partnerLocationId) {
    const { data: partner, error: partnerErr } = await admin
      .from('conscious_locations')
      .select('id, status')
      .eq('id', partnerLocationId)
      .maybeSingle()
    if (partnerErr) {
      console.error('[api/signals POST] partner lookup', partnerErr)
      return { ok: false, status: 500, error: 'Partner location check failed' }
    }
    if (!partner) {
      return { ok: false, status: 400, error: 'Unknown partner_location_id' }
    }
    if (partner.status !== 'active') {
      return { ok: false, status: 400, error: 'Partner location is not active' }
    }
    if (partner.id === payload.conscious_location_id) {
      return {
        ok: false,
        status: 400,
        error:
          'partner_location_id must differ from conscious_location_id (alcaldía)',
      }
    }
  }

  const { data: target, error: tErr } = await admin
    .from('citizen_targets')
    .select('id, target_kind')
    .eq('id', payload.citizen_target_id)
    .maybeSingle()
  if (tErr) {
    console.error('[api/signals POST] target lookup', tErr)
    return { ok: false, status: 500, error: 'Target check failed' }
  }
  if (!target) {
    return { ok: false, status: 400, error: 'Unknown target' }
  }
  if (target.target_kind !== payload.target_kind) {
    return {
      ok: false,
      status: 400,
      error: 'target_kind mismatch with citizen_targets row',
    }
  }

  return { ok: true, partnerLocationId, streetReference }
}

export async function POST(request: NextRequest) {
  if (!flagOn()) return notFound()

  try {
    const user = await getCurrentUserFromRequest(request)
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
    const parsed = createSignalBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const payload = parsed.data

    if (
      payload.routing_mode === 'observation' &&
      observationPayloadHasForbiddenRoutedFields(json)
    ) {
      return NextResponse.json(
        {
          error:
            'Observation signals must not include target or location FK fields',
        },
        { status: 400 }
      )
    }

    const evidenceError = validateSignalEvidence(payload.evidence)
    if (evidenceError) {
      return NextResponse.json({ error: evidenceError }, { status: 400 })
    }

    if (payload.anonymous_display_mode && !payload.anonymous_display_name) {
      return NextResponse.json(
        {
          error: 'anonymous_display_name is required when anonymous_display_mode=true',
        },
        { status: 400 }
      )
    }

    const contentPolicyError = firstSignalContentPolicyViolation([
      payload.title,
      payload.body,
      payload.anonymous_display_name,
      payload.routing_mode === 'observation'
        ? normalizeLocality(payload.locality)
        : null,
    ])
    if (contentPolicyError) {
      return NextResponse.json({ error: contentPolicyError }, { status: 400 })
    }

    const admin = createSignalsAdminClient()

    let insertRow: CitizenSignalGeographyInsert

    if (payload.routing_mode === 'observation') {
      const observation = payload as ObservationCreateBody
      insertRow = {
        public_slug: mintSignalSlug(observation.title),
        routing_mode: 'observation',
        country_code: observation.country_code,
        city_slug: observation.city_slug,
        locality: normalizeLocality(observation.locality),
        post_type: observation.post_type,
        category: observation.category,
        severity: observation.severity,
        target_kind: null,
        citizen_target_id: null,
        title: observation.title,
        body: observation.body,
        language: observation.language,
        conscious_location_id: null,
        partner_location_id: null,
        street_reference: null,
        author_user_id: user.id,
        anonymous_display_mode: observation.anonymous_display_mode ?? false,
        anonymous_display_name: observation.anonymous_display_name ?? null,
        publication_status: 'pending_review',
      }
    } else {
      const routed = payload as RoutedCreateBody
      const routedCheck = await validateRoutedGeographyAndTarget(admin, routed)
      if (!routedCheck.ok) {
        return NextResponse.json(
          { error: routedCheck.error },
          { status: routedCheck.status }
        )
      }

      const routedContentPolicyError = firstSignalContentPolicyViolation([
        routedCheck.streetReference,
      ])
      if (routedContentPolicyError) {
        return NextResponse.json(
          { error: routedContentPolicyError },
          { status: 400 }
        )
      }

      insertRow = {
        public_slug: mintSignalSlug(routed.title),
        routing_mode: 'routed',
        country_code: routed.country_code ?? 'MX',
        city_slug: routed.city_slug ?? 'cdmx',
        locality: null,
        post_type: routed.post_type,
        category: routed.category,
        severity: routed.severity,
        target_kind: routed.target_kind,
        citizen_target_id: routed.citizen_target_id,
        title: routed.title,
        body: routed.body,
        language: routed.language,
        conscious_location_id: routed.conscious_location_id,
        partner_location_id: routedCheck.partnerLocationId,
        street_reference: routedCheck.streetReference,
        author_user_id: user.id,
        anonymous_display_mode: routed.anonymous_display_mode ?? false,
        anonymous_display_name: routed.anonymous_display_name ?? null,
        publication_status: 'pending_review',
      }
    }

    const { data: insertedSignal, error: insertErr } = await admin
      .from('citizen_signals')
      .insert(insertRow as Database['public']['Tables']['citizen_signals']['Insert'])
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
