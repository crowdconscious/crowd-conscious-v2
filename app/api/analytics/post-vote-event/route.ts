import { NextResponse } from 'next/server'

/**
 * Post-vote screen analytics endpoint.
 *
 * Today this just writes to Vercel server logs (7-day retention) so we
 * can measure newsletter conversions, share-channel mix, and dismiss
 * rate during the MH pilot without spinning up a new Supabase table.
 * Swap the body of this route when you wire a real analytics sink — the
 * client call site (`lib/post-vote-analytics.ts`) stays unchanged.
 *
 * Always returns 200; never throws on bad input. Tracking must never
 * fail a user flow.
 */

const VALID_EVENTS = new Set([
  'newsletter_signup_post_vote',
  'share_click_post_vote',
  'close_post_vote_screen',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  const marketId =
    typeof body.marketId === 'string' && UUID_RE.test(body.marketId) ? body.marketId : null
  const channel =
    typeof body.channel === 'string' ? body.channel.slice(0, 32) : null
  const userType =
    body.userType === 'guest' || body.userType === 'registered' ? body.userType : null
  const locale = body.locale === 'en' ? 'en' : body.locale === 'es' ? 'es' : null
  const alreadySubscribed = body.alreadySubscribed === true ? true : null

  // Vercel logs JSON-serialized lines; this format is grep-friendly.
  console.info('[post-vote-analytics]', {
    event,
    marketId,
    channel,
    userType,
    locale,
    alreadySubscribed,
    at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
