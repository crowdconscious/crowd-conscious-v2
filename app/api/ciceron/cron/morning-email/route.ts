import { NextRequest, NextResponse } from 'next/server'
import {
  authorizeMorningEmailCron,
  isMorningEmailEnabled,
} from '@/lib/ciceron/engagement/morning-email-gate'
import { runMorningEmailCron } from '@/lib/ciceron/engagement/morning-email-send'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * 09:00 America/Mexico_City morning digest (before coordinator 09:30).
 * Schedule in vercel.json as 15:00 UTC (CST = UTC−6 year-round).
 *
 * Gated by CICERON_MORNING_EMAIL_ENABLED (default off).
 * Auth: Authorization Bearer CRON_SECRET.
 * Do not set env vars from this PR.
 */
export async function GET(req: NextRequest) {
  if (!authorizeMorningEmailCron(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  if (!isMorningEmailEnabled()) {
    return NextResponse.json(
      { ok: false, reason: 'disabled', hint: 'Set CICERON_MORNING_EMAIL_ENABLED=true' },
      { status: 409 }
    )
  }
  const summary = await runMorningEmailCron()
  return NextResponse.json({ ok: true, summary })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
