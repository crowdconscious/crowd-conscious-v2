import { NextRequest, NextResponse } from 'next/server'
import {
  BACKFILL_WALL_CLOCK_MS,
  DEFAULT_BACKFILL_BATCH_LIMIT,
  runBackfillBatches,
} from '@/lib/ciceron/dof/backfill-batch'
import {
  authorizeCronBearer,
  isBackfillEnabled,
} from '@/lib/ciceron/dof/backfill-gate'
import {
  BACKFILL_SINCE_DAY,
  BACKFILL_SINCE_ISO,
  BACKFILL_TAG,
  COST_CAP_USD,
} from '@/lib/ciceron/dof/backfill-cost'
import { DEFAULT_REQUEST_TIMEOUT_MS } from '@/lib/ciceron/gateway/request-timeout'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Pre-demo DOF classify/match backfill — serverless batches.
 *
 * Gated by CICERON_BACKFILL_ENABLED (default off → 409). Independent of
 * CICERON_INGESTION_ENABLED; do not flip daily DOF ingest from this route.
 *
 * Auth: Authorization: Bearer $CRON_SECRET (timing-safe compare).
 *
 * Scheduling: vercel.json cron every 5 minutes (same cadence as other
 * existing jobs on this project). Kill switch must be on for work to run.
 *
 * Manual loop if cron is unavailable:
 *   while true; do
 *     curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *       "$APP_URL/api/ciceron/cron/backfill" || break
 *     sleep 30
 *   done
 *
 * Before enabling: apply migration 329 (claim lease + spend RPC).
 */
function authorize(req: NextRequest): boolean {
  return authorizeCronBearer(req.headers.get('authorization'))
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}

async function handle(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isBackfillEnabled()) {
    console.info(
      '[ciceron] backfill cron refused: CICERON_BACKFILL_ENABLED is off (default)'
    )
    return NextResponse.json(
      {
        ok: false,
        error: 'CICERON_BACKFILL_ENABLED_off',
        hint: 'Set CICERON_BACKFILL_ENABLED=true in Vercel to run pre-demo backfill batches. Leaves CICERON_INGESTION_ENABLED untouched.',
      },
      { status: 409 }
    )
  }

  let retryFailed = false
  let batchLimit = DEFAULT_BACKFILL_BATCH_LIMIT
  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as {
        retryFailed?: boolean
        limit?: number
      }
      retryFailed = body.retryFailed === true
      if (
        typeof body.limit === 'number' &&
        Number.isInteger(body.limit) &&
        body.limit >= 1 &&
        body.limit <= 50
      ) {
        batchLimit = body.limit
      }
    } catch {
      // empty body is fine
    }
  }
  if (req.nextUrl.searchParams.get('retryFailed') === '1') {
    retryFailed = true
  }

  try {
    const totals = await runBackfillBatches({
      sinceIso: BACKFILL_SINCE_ISO,
      tag: BACKFILL_TAG,
      retryFailed,
      batchLimit,
      wallClockMs: BACKFILL_WALL_CLOCK_MS,
      requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
      useClaims: true,
    })

    return NextResponse.json({
      ok: true,
      tag: BACKFILL_TAG,
      since: BACKFILL_SINCE_DAY,
      processed: totals.processed,
      classified: totals.classified,
      failed: totals.failed,
      matches: totals.matches,
      matchedNotes: totals.matchedNotes,
      remaining: totals.remaining,
      cumulativeSpendUsd: totals.cumulativeSpendUsd,
      sessionCostUsd: totals.sessionCostUsd,
      capUsd: COST_CAP_USD,
      rounds: totals.rounds,
      done: totals.done,
      stopReason: totals.stopReason,
      requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
      wallClockMs: BACKFILL_WALL_CLOCK_MS,
    })
  } catch (err) {
    // runBackfillBatches releases this invocation's claims before rethrowing.
    const message = err instanceof Error ? err.message : 'backfill_failed'
    console.warn('[ciceron] backfill cron failed', message)
    return NextResponse.json(
      { ok: false, error: 'backfill_failed' },
      { status: 500 }
    )
  }
}
