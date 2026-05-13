import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import {
  standardRateLimit,
  getRateLimitIdentifier,
} from '@/lib/rate-limit'
import { hashIpForStorage } from '@/lib/signals/fingerprint'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Anonymous "Apoyo" support endpoint.
 *
 * - No auth required. If the caller IS signed in we 400 with a hint to
 *   use /cosign instead — anon support is strictly a friction-light
 *   pathway for casual visitors and shouldn't double-count for users
 *   who can already cast a verified co-sign.
 * - Dedupe is enforced by the unique(signal_id, device_fingerprint)
 *   constraint; the duplicate path returns 200 with alreadySupported:true
 *   so the client can render an idempotent "tick" state.
 * - IP is SHA-256(`${ip}:${SIGNALS_IP_SALT}`) so we never persist the
 *   raw address. Salt missing → we drop the column rather than fail the
 *   request (we still have the device fingerprint).
 */

function flagOn() {
  return process.env.SIGNALS_ENABLED === 'true'
}

function readIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return request.headers.get('x-real-ip')
}

const FINGERPRINT_MIN = 16
const FINGERPRINT_MAX = 256

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!flagOn()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const user = await getCurrentUser()
    if (user) {
      return NextResponse.json(
        {
          error:
            'Authenticated users should use the verified cosign endpoint.',
          code: 'USE_COSIGN',
          hint: '/api/signals/[slug]/cosign',
        },
        { status: 400 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const fingerprint =
      body && typeof body === 'object' && 'deviceFingerprint' in body
        ? (body as { deviceFingerprint?: unknown }).deviceFingerprint
        : undefined
    if (
      typeof fingerprint !== 'string' ||
      fingerprint.length < FINGERPRINT_MIN ||
      fingerprint.length > FINGERPRINT_MAX
    ) {
      return NextResponse.json(
        { error: 'Bad fingerprint' },
        { status: 400 }
      )
    }

    if (standardRateLimit) {
      const idIp = await getRateLimitIdentifier(request)
      const rate = await standardRateLimit.limit(
        `signals-anon-support:${idIp}:${fingerprint.slice(0, 16)}`
      )
      if (!rate.success) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
      }
    }

    const { slug } = await params
    if (!slug || slug.length > 200) {
      return NextResponse.json({ error: 'Bad slug' }, { status: 400 })
    }

    const admin = createSignalsAdminClient()
    const { data: signal, error: lookupErr } = await admin
      .from('citizen_signals')
      .select('id, publication_status')
      .eq('public_slug', slug)
      .maybeSingle()
    if (lookupErr) {
      console.error('[api/signals/anonymous-support POST] lookup', lookupErr)
      return NextResponse.json(
        { error: lookupErr.message },
        { status: 500 }
      )
    }
    if (!signal || signal.publication_status !== 'published') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const ip = readIp(request)
    const ipHash = await hashIpForStorage(
      ip,
      process.env.SIGNALS_IP_SALT
    )

    // Insert; on conflict (existing row for this device) we treat it as
    // a no-op success rather than an error. We have to use a manual
    // duplicate detection because supabase-js doesn't expose
    // `on conflict do nothing returning`, so we INSERT and inspect the
    // error code: 23505 = unique_violation.
    const { error: insertErr } = await admin
      .from('citizen_signal_anonymous_supports')
      .insert({
        signal_id: signal.id,
        device_fingerprint: fingerprint,
        ip_hash: ipHash,
      })

    let alreadySupported = false
    if (insertErr) {
      if ((insertErr as { code?: string }).code === '23505') {
        alreadySupported = true
      } else {
        console.error(
          '[api/signals/anonymous-support POST] insert',
          insertErr
        )
        return NextResponse.json(
          { error: insertErr.message },
          { status: 500 }
        )
      }
    }

    // Read the fresh counter from the parent row (the trigger has
    // already incremented it for the success path; for duplicates we
    // just want to surface the current value so the UI reconciles).
    const { data: fresh } = await admin
      .from('citizen_signals')
      .select('anonymous_support_count')
      .eq('id', signal.id)
      .maybeSingle()

    return NextResponse.json({
      ok: true,
      alreadySupported,
      anonymous_support_count: fresh?.anonymous_support_count ?? null,
    })
  } catch (err) {
    console.error('[api/signals/anonymous-support POST] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
