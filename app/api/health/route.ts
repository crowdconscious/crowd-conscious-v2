import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Uptime probe for an external monitor (UptimeRobot / Better Stack, see
 * docs/OPS-MONITORING.md). Returns 200 when the app and the database answer,
 * 503 otherwise. Exposes no data beyond ok/latency.
 */
export async function GET() {
  const started = Date.now()
  let db = false
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('prediction_markets').select('id', { head: true, count: 'planned' }).limit(1)
    db = !error
  } catch {
    db = false
  }
  return NextResponse.json(
    { ok: db, db, ms: Date.now() - started, commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null },
    { status: db ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
