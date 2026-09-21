import { NextResponse } from 'next/server'

/**
 * UX overhaul Phase 1 event sink.
 * Logs to Vercel (grep `[ux-overhaul-analytics]`). Always 200.
 */

const VALID_EVENTS = new Set([
  'feed_viewed',
  'card_impression',
  'card_tapped',
  'action_completed',
  'action_abandoned',
  'reveal_shown',
  'reveal_share_tapped',
  'reasons_block_shown',
  'permission_prompted',
  'permission_granted',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function optUuid(v: unknown): string | null {
  return typeof v === 'string' && UUID_RE.test(v) ? v : null
}

function optStr(v: unknown, max = 64): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

function optNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: true })
  }

  const event = String(body.event ?? '')
  if (!VALID_EVENTS.has(event)) {
    return NextResponse.json({ ok: true })
  }

  const surface = body.surface === 'app' ? 'app' : 'web'

  console.info('[ux-overhaul-analytics]', {
    event,
    surface,
    anon_id: optUuid(body.anon_id),
    user_id: optUuid(body.user_id),
    session_id: optUuid(body.session_id) ?? optStr(body.session_id, 64),
    card_types: Array.isArray(body.card_types)
      ? body.card_types.filter((t) => typeof t === 'string').slice(0, 12)
      : null,
    card_count: optNum(body.card_count),
    header_scope: optStr(body.header_scope, 48),
    card_type: optStr(body.card_type, 32),
    position: optNum(body.position),
    object_id: optUuid(body.object_id) ?? optStr(body.object_id, 64),
    action_type: optStr(body.action_type, 32),
    seconds_since_open: optNum(body.seconds_since_open),
    step: optStr(body.step, 48),
    headline_case: optStr(body.headline_case, 48),
    vote_n: optNum(body.vote_n),
    reason_count: optNum(body.reason_count),
    type: optStr(body.type, 32),
    trigger_point: optStr(body.trigger_point, 48),
    timestamp:
      typeof body.timestamp === 'string' ? body.timestamp : new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
