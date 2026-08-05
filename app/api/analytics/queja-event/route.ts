import { NextResponse } from 'next/server'

/**
 * Señal Express (/queja) analytics endpoint (§7.1).
 *
 * Mirrors app/api/analytics/post-vote-event: validates the event name against
 * the exact specced set, writes one grep-friendly console.info line to the
 * Vercel logs, and always returns 200 (tracking must never fail a user flow).
 * Swap the body when a real analytics sink is wired — the client call site
 * (lib/senal-express/analytics.ts) stays unchanged.
 */

const VALID_EVENTS = new Set([
  'queja_landing_view',
  'queja_flow_start',
  'queja_draft_ready',
  'queja_pdf_download',
  'queja_senal_created',
])

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

  const alcaldia =
    typeof body.alcaldia === 'string' ? body.alcaldia.slice(0, 40) : null
  const category =
    typeof body.category === 'string' ? body.category.slice(0, 40) : null
  const locale = body.locale === 'en' ? 'en' : body.locale === 'es' ? 'es' : null
  const signalCreated = body.signalCreated === true ? true : null

  console.info('[queja-analytics]', {
    event,
    alcaldia,
    category,
    locale,
    signalCreated,
    at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
