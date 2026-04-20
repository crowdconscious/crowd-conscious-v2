import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { lenientRateLimit } from '@/lib/rate-limit'

// Lightweight, fire-and-forget share analytics. The client calls this
// AFTER a successful share action. We intentionally never fail the
// user's share flow because of tracking — every error is a 200 no-op.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CC_SESSION = 'cc_session'

const CHANNELS = new Set([
  'whatsapp',
  'native_share',
  'clipboard',
  'twitter',
  'facebook',
  'story_download',
  'other',
])

type Body = {
  channel?: string
  surface?: string
  market_id?: string
  location_id?: string
  other_type?: string
  other_id?: string
}

function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ ok: true }) // ignore malformed
  }

  const channel = (body.channel || '').toString().trim()
  if (!CHANNELS.has(channel)) {
    return NextResponse.json({ ok: true }) // silently drop
  }

  const marketId = body.market_id && UUID_REGEX.test(body.market_id) ? body.market_id : null
  const locationId =
    body.location_id && UUID_REGEX.test(body.location_id) ? body.location_id : null
  const otherType =
    typeof body.other_type === 'string' && body.other_type.trim().length > 0
      ? body.other_type.trim().slice(0, 40)
      : null
  const otherId =
    typeof body.other_id === 'string' && body.other_id.trim().length > 0
      ? body.other_id.trim().slice(0, 120)
      : null

  // At least one target is required; otherwise drop silently.
  if (!marketId && !locationId && !(otherType && otherId)) {
    return NextResponse.json({ ok: true })
  }

  const surface =
    typeof body.surface === 'string' && body.surface.trim().length > 0
      ? body.surface.trim().slice(0, 40)
      : null

  // Cheap rate limit: 50 shares / min per IP (or user). Failures are
  // swallowed — we'd rather drop an event than 500.
  try {
    if (lenientRateLimit) {
      const user = await getCurrentUser().catch(() => null)
      const key = user?.id ? `share:u:${user.id}` : `share:ip:${clientKey(request)}`
      const { success } = await lenientRateLimit.limit(key)
      if (!success) return NextResponse.json({ ok: true })
    }
  } catch {
    // Rate limiter offline — continue; this endpoint is non-critical.
  }

  try {
    const user = await getCurrentUser().catch(() => null)

    let anonymousParticipantId: string | null = null
    if (!user) {
      const cookieStore = await cookies()
      const sessionId = cookieStore.get(CC_SESSION)?.value
      if (sessionId && UUID_REGEX.test(sessionId)) {
        const admin = createAdminClient()
        const { data: participant } = await admin
          .from('anonymous_participants')
          .select('id')
          .eq('session_id', sessionId)
          .is('converted_to_user_id', null)
          .maybeSingle()
        anonymousParticipantId = participant?.id ?? null
      }
    }

    // Derive source_type from the target. Mirrors the backfill rule in
    // migration 207 so old and new rows use the same vocabulary.
    const sourceType: 'pulse' | 'location' | 'cause' | 'other' = marketId
      ? 'pulse'
      : locationId
        ? 'location'
        : otherType === 'cause'
          ? 'cause'
          : 'other'

    const admin = createAdminClient()
    const { error } = await admin.from('share_events').insert({
      channel,
      surface,
      market_id: marketId,
      location_id: locationId,
      other_type: otherType,
      other_id: otherId,
      source_type: sourceType,
      user_id: user?.id ?? null,
      anonymous_participant_id: anonymousParticipantId,
    })
    if (error) {
      // Likely a constraint mismatch or migration not applied yet.
      console.error('[share/track] insert failed:', error.message)
    }
  } catch (err) {
    console.error('[share/track] unexpected:', err)
  }

  return NextResponse.json({ ok: true })
}
