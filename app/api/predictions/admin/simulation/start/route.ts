export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-route-guard'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Start a Pulse Simulation run (§5.5 item 1). Admin-only. Delegates to
 * `lib/simulation/run.ts`:
 *  - `mode: 'market'`  → `startRun({ marketId })` (or `startBacktestRun` when
 *    `isBacktest` is set — an already-closed Pulse, §5.5.5).
 *  - `mode: 'brand'`   → `startRun({ isBrandPretest: true, questionOverride,
 *    options, description })` — a Pulse Sim tier brand pre-test, no market_id.
 *
 * The heavy pipeline module (Anthropic SDK) is loaded lazily via dynamic import,
 * matching `run-agent/route.ts`. READ-ONLY on real market tables; never writes
 * `prediction_markets`.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const body = (await request.json().catch(() => ({}))) as {
    mode?: string
    marketId?: string
    isBacktest?: boolean
    questionOverride?: string
    options?: unknown
    description?: string | null
    personaVersion?: string
    nAgents?: number | string
  }

  const isBrandPretest = body.mode === 'brand'
  const personaVersion =
    typeof body.personaVersion === 'string' && body.personaVersion.trim().length > 0
      ? body.personaVersion.trim()
      : 'cdmx-v1'
  const nAgents = Number(body.nAgents)
  if (!Number.isFinite(nAgents) || nAgents <= 0) {
    return NextResponse.json(
      { error: 'nAgents must be a positive integer' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  try {
    const { startRun, startBacktestRun } = await import('@/lib/simulation/run')

    if (isBrandPretest) {
      const options = Array.isArray(body.options)
        ? body.options
            .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
            .map((o) => o.trim())
        : []
      const questionOverride =
        typeof body.questionOverride === 'string' ? body.questionOverride.trim() : ''
      if (!questionOverride || options.length < 2) {
        return NextResponse.json(
          { error: 'A brand pre-test requires a question and at least 2 options' },
          { status: 400 },
        )
      }
      const result = await startRun({
        isBrandPretest: true,
        questionOverride,
        options,
        description:
          typeof body.description === 'string' && body.description.trim().length > 0
            ? body.description.trim()
            : null,
        personaVersion,
        nAgents,
        adminClient: admin,
      })
      return NextResponse.json({ ok: true, result })
    }

    const marketId = typeof body.marketId === 'string' ? body.marketId.trim() : ''
    if (!marketId) {
      return NextResponse.json(
        { error: 'marketId is required for a market run' },
        { status: 400 },
      )
    }

    const result =
      body.isBacktest === true
        ? await startBacktestRun(marketId, {
            personaVersion,
            nAgents,
            adminClient: admin,
          })
        : await startRun({ marketId, personaVersion, nAgents, adminClient: admin })

    return NextResponse.json({ ok: true, result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
