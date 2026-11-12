import { NextRequest, NextResponse } from 'next/server'
import {
  backfillPendingEmbeddings,
  type PipelineCursor,
  runDofIngestDay,
} from '@/lib/ciceron/dof/pipeline'
import { runClassifyMatchBatch } from '@/lib/ciceron/dof/classify-match'
import { todayInMexicoCity } from '@/lib/ciceron/dof/dates'
import { backfillArchiveEmbeddings } from '@/lib/ciceron/m365/archive-embeddings'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Daily DOF ingest is gated by CICERON_INGESTION_ENABLED (default off).
 * To turn on (CTO only — do not change Vercel env from this PR):
 * 1. Vercel → Project → Settings → Environment Variables
 * 2. Add CICERON_INGESTION_ENABLED=true (Production)
 * 3. Optional: CICERON_INGESTION_DAILY_CAP_USD=25 (default 25)
 * 4. Redeploy so cron picks up the env
 * 5. Confirm vercel.json schedules for /api/ciceron/cron/dof are present
 */
function ingestionEnabled(): boolean {
  const raw = process.env.CICERON_INGESTION_ENABLED?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

function dailyCapUsd(): number {
  const raw = process.env.CICERON_INGESTION_DAILY_CAP_USD?.trim()
  const n = raw ? Number(raw) : 25
  return Number.isFinite(n) && n > 0 ? n : 25
}

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function spendTodayUsd(): Promise<number> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return 0
  // Midnight America/Mexico_City (UTC−6 year-round) as UTC instant
  const day = todayInMexicoCity()
  const startIso = `${day}T06:00:00.000Z`
  const { data } = await db
    .from('ai_runs')
    .select('cost_estimate_usd, purpose')
    .gte('created_at', startIso)
    .limit(5000)
  const rows = (Array.isArray(data) ? data : []) as {
    cost_estimate_usd: number | null
    purpose: string | null
  }[]
  return rows.reduce((s, r) => {
    const purpose = r.purpose ?? ''
    if (
      !(
        purpose.startsWith('dof_') ||
        purpose === 'watch_profile_embed'
      )
    ) {
      return s
    }
    return s + (Number(r.cost_estimate_usd) || 0)
  }, 0)
}

/**
 * DOF / SIDOF ingest cron (+ optional classify/match chain).
 * Schedules (CDMX → UTC) are registered in vercel.json.
 */
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

  if (!ingestionEnabled()) {
    console.info(
      '[ciceron] dof cron skipped: CICERON_INGESTION_ENABLED is off (default)'
    )
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'CICERON_INGESTION_ENABLED_off',
    })
  }

  const spent = await spendTodayUsd()
  const cap = dailyCapUsd()
  if (spent >= cap) {
    console.info(
      `[ciceron] dof cron skipped: daily spend ${spent.toFixed(4)} >= cap ${cap}`
    )
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'daily_spend_cap',
      spentUsd: spent,
      capUsd: cap,
    })
  }

  let body: {
    targetDate?: string
    cursor?: PipelineCursor
    attempt?: number
    backfillEmbeddings?: boolean
    backfillArchiveEmbeddings?: boolean
    classifyMatchOnly?: boolean
  } = {}
  if (req.method === 'POST') {
    try {
      body = (await req.json()) as typeof body
    } catch {
      body = {}
    }
  }

  const targetDate =
    body.targetDate ||
    req.nextUrl.searchParams.get('date') ||
    todayInMexicoCity()

  if (
    body.backfillArchiveEmbeddings ||
    req.nextUrl.searchParams.get('backfillArchive') === '1'
  ) {
    const result = await backfillArchiveEmbeddings(16)
    return NextResponse.json({
      ok: true,
      mode: 'archive_embed_backfill',
      ...result,
    })
  }

  if (body.backfillEmbeddings || req.nextUrl.searchParams.get('backfill') === '1') {
    const result = await backfillPendingEmbeddings(16)
    return NextResponse.json({ ok: true, mode: 'embed_backfill', ...result })
  }

  if (body.classifyMatchOnly || req.nextUrl.searchParams.get('classify') === '1') {
    const stats = await runClassifyMatchBatch({
      limit: 6,
      noteDate: targetDate,
      onlyPending: true,
    })
    return NextResponse.json({ ok: true, mode: 'classify_match', ...stats })
  }

  const result = await runDofIngestDay({
    targetDate,
    cursor: body.cursor,
    attempt: body.attempt ?? 1,
  })

  if (result.requeue && process.env.VERCEL_URL && process.env.CRON_SECRET) {
    const url = `https://${process.env.VERCEL_URL}/api/ciceron/cron/dof`
    void fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetDate: result.targetDate,
        cursor: result.cursor,
        attempt: (body.attempt ?? 1) + 1,
      }),
    }).catch((err) => console.warn('[ciceron] dof requeue failed', err))
  }

  let classifyMatch: Awaited<ReturnType<typeof runClassifyMatchBatch>> | null = null
  if (!result.requeue && result.status === 'succeeded' && process.env.ANTHROPIC_API_KEY) {
    classifyMatch = await runClassifyMatchBatch({
      limit: 4,
      noteDate: result.targetDate,
      onlyPending: true,
    })
  }

  return NextResponse.json({
    ok: result.status !== 'failed',
    ...result,
    classifyMatch,
  })
}
