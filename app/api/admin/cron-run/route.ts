import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { findCronMeta } from '@/lib/cron-catalog'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/cron-run { job: string }
 *
 * Admin-only proxy for the operational crons (live-auto-end,
 * pulse-auto-resolve, newsletter, monthly-impact, etc). Agent crons stay
 * on /api/predictions/admin/run-agent because they share an LLM-cost
 * tracking pipeline.
 *
 * The CRON_SECRET never leaves the server: we synthesize a NextRequest
 * with the bearer header and invoke the route module's exported GET()
 * directly via dynamic import. That avoids both an HTTP roundtrip and
 * any chance of the secret being exposed to the client.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentUser()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const sessionEmail = profile.email?.toLowerCase().trim()
  const isAdmin =
    profile.user_type === 'admin' ||
    (!!adminEmail && !!sessionEmail && sessionEmail === adminEmail)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const job = typeof body.job === 'string' ? body.job : ''
  const meta = findCronMeta(job)
  if (!meta || meta.kind !== 'operational' || !meta.routePath) {
    return NextResponse.json(
      { error: 'Unknown or non-operational job' },
      { status: 400 }
    )
  }
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 500 }
    )
  }

  const startedAt = Date.now()
  try {
    // Whitelisted dynamic import — meta.routePath is hardcoded in
    // lib/cron-catalog.ts and never reaches user input.
    const mod: { GET?: (req: NextRequest) => Promise<Response> } = await import(
      `@/${meta.routePath}`
    )
    if (typeof mod.GET !== 'function') {
      return NextResponse.json(
        { error: `Route ${meta.routePath} has no GET export` },
        { status: 500 }
      )
    }

    const synthetic = new NextRequest(
      new URL(`/${meta.routePath}`, request.url),
      {
        method: 'GET',
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }
    )

    const res = await mod.GET(synthetic)
    const text = await res.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }

    return NextResponse.json({
      success: res.ok,
      job,
      status: res.status,
      duration_ms: Date.now() - startedAt,
      result: parsed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/cron-run]', job, err)
    return NextResponse.json(
      { success: false, job, error: message, duration_ms: Date.now() - startedAt },
      { status: 500 }
    )
  }
}
