import { NextRequest, NextResponse } from 'next/server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { lenientRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Citizen Signals — public detail by slug.
 *
 * Returns the citizen_signals_public row + the matching citizen_target row
 * + public-visibility evidence + any official responses. The full
 * citizen_signals row (including author_user_id and ai_scores) is NEVER
 * returned here — that surface lives under /api/admin/signals.
 */

function flagOn() {
  return process.env.SIGNALS_ENABLED === 'true'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!flagOn()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    if (lenientRateLimit) {
      const id = await getRateLimitIdentifier(request)
      const rate = await lenientRateLimit.limit(`signals-detail:${id}`)
      if (!rate.success) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
      }
    }

    const { slug } = await params
    if (!slug || slug.length > 200) {
      return NextResponse.json({ error: 'Bad slug' }, { status: 400 })
    }

    const admin = createSignalsAdminClient()

    const { data: signal, error: sErr } = await admin
      .from('citizen_signals_public')
      .select(
        'id, public_slug, post_type, category, severity, target_kind, citizen_target_id, title, body, language, conscious_location_id, display_name, anonymous_display_mode, threshold_stage, cosign_count, anonymous_support_count, stage1_met_at, stage2_met_at, created_at, updated_at'
      )
      .eq('public_slug', slug)
      .maybeSingle()

    if (sErr) {
      console.error('[api/signals/[slug] GET] signal', sErr)
      return NextResponse.json({ error: sErr.message }, { status: 500 })
    }
    if (!signal) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: target } = await admin
      .from('citizen_targets')
      .select('id, slug, display_name, target_kind, conscious_location_id')
      .eq('id', signal.citizen_target_id)
      .maybeSingle()

    const { data: location } = await admin
      .from('conscious_locations')
      .select('id, slug, name, city, neighborhood, latitude, longitude')
      .eq('id', signal.conscious_location_id)
      .maybeSingle()

    const { data: evidence } = await admin
      .from('citizen_signal_evidence')
      .select('id, kind, storage_path, external_url, caption, created_at')
      .eq('signal_id', signal.id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: true })

    const { data: responses } = await admin
      .from('citizen_signal_responses')
      .select('id, author_label, body, official_status, created_at')
      .eq('signal_id', signal.id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      signal,
      target: target ?? null,
      location: location ?? null,
      evidence: evidence ?? [],
      responses: responses ?? [],
    })
  } catch (err) {
    console.error('[api/signals/[slug] GET] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
