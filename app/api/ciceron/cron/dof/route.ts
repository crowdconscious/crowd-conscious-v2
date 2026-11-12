import { NextRequest, NextResponse } from 'next/server'
import {
  backfillPendingEmbeddings,
  type PipelineCursor,
  runDofIngestDay,
} from '@/lib/ciceron/dof/pipeline'
import { runClassifyMatchBatch } from '@/lib/ciceron/dof/classify-match'
import { todayInMexicoCity } from '@/lib/ciceron/dof/dates'
import { backfillArchiveEmbeddings } from '@/lib/ciceron/m365/archive-embeddings'

export const runtime = 'nodejs'
export const maxDuration = 300

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
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

  // Re-enqueue remainder via fire-and-forget self-call when possible
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

  // After a finished ingest day, chain a classify/match batch for that date
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
