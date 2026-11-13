/**
 * Backfill classification + matching for every ingested edition, oldest → newest.
 * Resumable batches. Idempotent on already-classified/matched notes when --only-pending.
 *
 * Usage:
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --dry-run --since=2026-11-12
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --since=2026-11-12 --limit=8
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --since=2026-11-12 --tag=pre-demo
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --since=2026-11-12 --retry-failed
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --since=2026-11-12 --request-timeout-ms=60000
 *
 * Hard US$60 cumulative spend since --since. Pre-flight estimate over the cap
 * warns but still starts; each batch is projected against remaining budget.
 * Each model call times out (default 60s) with up to 2 retries; a batch with
 * no progress for 5 minutes logs batch_stalled and exits non-zero (resumable).
 */
import { createClient } from '@supabase/supabase-js'
import { runClassifyMatchBatch } from '../../lib/ciceron/dof/classify-match'
import { setCompleteRequestPolicy } from '../../lib/ciceron/gateway/complete'
import {
  BATCH_STALL_MS,
  isBatchStalled,
} from '../../lib/ciceron/gateway/request-timeout'
import {
  abortIfSpendAtCap,
  assertUnderCap,
  COST_CAP_USD,
  ESTIMATE_MARGIN,
  estimateNotesUsd,
  fetchAllRows,
  parseFlags,
  perNoteCostFromRates,
  projectBatchAffordable,
  sumBackfillSpendSince,
  type AiRunRate,
} from './_cost-cap'

type NoteRow = {
  id: string
  note_date: string
  classify_status: string
  match_status: string
}

function pendingOr(retryFailed: boolean): string {
  return retryFailed
    ? 'classify_status.in.(pending,failed),match_status.in.(pending,failed)'
    : 'classify_status.eq.pending,match_status.eq.pending'
}

/** Prefer last ~2 days of runs so the estimate tracks the current corpus. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadRecentRates(sb: any): Promise<AiRunRate[]> {
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const rows = await fetchAllRows<{
    purpose: string
    cost_estimate_usd: number | null
  }>(
    sb
      .from('ai_runs')
      .select('purpose, cost_estimate_usd')
      .in('purpose', ['dof_classify', 'dof_match_relevance'])
      .gte('created_at', since)
  )
  const by = new Map<string, number[]>()
  for (const r of rows) {
    if (r.cost_estimate_usd == null) continue
    const list = by.get(r.purpose) ?? []
    list.push(Number(r.cost_estimate_usd))
    by.set(r.purpose, list)
  }
  return [...by.entries()].map(([purpose, costs]) => ({
    purpose,
    avgCostUsd: costs.reduce((a, b) => a + b, 0) / costs.length,
    sampleSize: costs.length,
  }))
}

async function main() {
  const flags = parseFlags(process.argv.slice(2))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (!flags.sinceIso || !flags.sinceDay) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'since_required',
        hint: 'Pass --since=YYYY-MM-DD so the US$60 cap is cumulative across runs.',
      })
    )
    process.exit(1)
  }

  const sb = createClient(url, key, { db: { schema: 'ciceron' } })
  const orFilter = pendingOr(flags.retryFailed)

  const [{ count: ingestedCount, error: ingestedErr }, { count: pendingCount, error: pendingErr }] =
    await Promise.all([
      sb
        .from('dof_notes')
        .select('id', { count: 'exact', head: true })
        .in('ingest_status', ['ready', 'embedding_pending']),
      sb
        .from('dof_notes')
        .select('id', { count: 'exact', head: true })
        .in('ingest_status', ['ready', 'embedding_pending'])
        .or(orFilter),
    ])
  if (ingestedErr || pendingErr) {
    console.error(ingestedErr?.message ?? pendingErr?.message)
    process.exit(1)
  }

  const { count: needClassifyCount, error: classifyErr } = await sb
    .from('dof_notes')
    .select('id', { count: 'exact', head: true })
    .in('ingest_status', ['ready', 'embedding_pending'])
    .in(
      'classify_status',
      flags.retryFailed ? ['pending', 'failed'] : ['pending']
    )
  if (classifyErr) {
    console.error(classifyErr.message)
    process.exit(1)
  }

  const pending = await fetchAllRows<NoteRow>(
    sb
      .from('dof_notes')
      .select('id, note_date, classify_status, match_status')
      .in('ingest_status', ['ready', 'embedding_pending'])
      .or(orFilter)
      .order('note_date', { ascending: true })
  )

  const rates = await loadRecentRates(sb)
  const sample = perNoteCostFromRates(rates)
  const pendingNotes = pendingCount ?? pending.length
  const needClassify =
    needClassifyCount ??
    pending.filter((p) => p.classify_status === 'pending' || (flags.retryFailed && p.classify_status === 'failed')).length
  const estimateUsd = estimateNotesUsd({
    pendingNotes,
    perNoteUsd: sample.perNoteUsd,
  })
  const editions = [...new Set(pending.map((r) => r.note_date))].sort()

  const priorSpendUsd = await sumBackfillSpendSince(sb, flags.sinceIso)
  const remainingBudgetUsd = Number((COST_CAP_USD - priorSpendUsd).toFixed(4))

  setCompleteRequestPolicy({ timeoutMs: flags.requestTimeoutMs })

  console.log(
    JSON.stringify({
      dryRun: flags.dryRun,
      since: flags.sinceDay,
      tag: flags.tag ?? null,
      retryFailed: flags.retryFailed,
      requestTimeoutMs: flags.requestTimeoutMs,
      batchStallMs: BATCH_STALL_MS,
      ingestedNotes: ingestedCount ?? 0,
      pendingNotes,
      needClassify,
      editions,
      editionCount: editions.length,
      perNoteUsd: sample.perNoteUsd,
      matchCallsPerNote: sample.matchCallsPerNote,
      estimateMargin: ESTIMATE_MARGIN,
      estimateUsd,
      priorSpendUsd: Number(priorSpendUsd.toFixed(6)),
      remainingBudgetUsd,
      projectedUsd: Number((priorSpendUsd + estimateUsd).toFixed(4)),
      capUsd: COST_CAP_USD,
      ratesSampled: rates,
      note: 'Estimate = pendingNotes × measured per-note blend × 1.15 margin. Live run may start over projection and stops before a batch that would exceed the cap.',
    })
  )

  // Soft for backfill: warn if over, but allow live start (hard stop is per-batch).
  assertUnderCap({
    estimateUsd,
    dryRun: flags.dryRun,
    label: 'backfill-classify-match',
    priorSpendUsd,
    hard: false,
  })

  if (flags.dryRun) {
    console.log(JSON.stringify({ ok: true, skipped: 'dry-run' }))
    return
  }

  if (priorSpendUsd >= COST_CAP_USD) {
    abortIfSpendAtCap({
      spentUsd: priorSpendUsd,
      label: 'backfill-classify-match',
    })
  }

  const requestedLimit = flags.limit && flags.limit > 0 ? flags.limit : 6
  const attemptedIds = new Set<string>()
  let sessionCost = 0
  let rounds = 0
  let totalMatchRows = 0
  let totalMatchedNotes = 0

  for (;;) {
    const spentBefore = await sumBackfillSpendSince(sb, flags.sinceIso)
    const projection = projectBatchAffordable({
      spentUsd: spentBefore,
      batchLimit: requestedLimit,
      perNoteUsd: sample.perNoteUsd,
      label: 'backfill-classify-match',
    })
    if (!projection.ok) {
      console.log(
        JSON.stringify({
          ok: true,
          stopped: projection.reason,
          cumulativeSpendUsd: Number(spentBefore.toFixed(6)),
          remainingBudgetUsd: projection.remainingBudgetUsd,
          capUsd: COST_CAP_USD,
          rounds,
          sessionCostUsd: Number(sessionCost.toFixed(6)),
          totalMatchRows,
          totalMatchedNotes,
        })
      )
      break
    }

    rounds += 1
    let lastProgressAt = Date.now()
    let lastProgressNoteId: string | null = null
    const stallCheckMs = Math.min(15_000, Math.max(1_000, Math.floor(BATCH_STALL_MS / 20)))
    const batchPromise = runClassifyMatchBatch({
      limit: projection.batchLimit,
      onlyPending: true,
      retryFailed: flags.retryFailed,
      excludeIds: attemptedIds,
      onProgress: ({ noteId }) => {
        lastProgressAt = Date.now()
        lastProgressNoteId = noteId
      },
    })

    const stats = await new Promise<Awaited<typeof batchPromise>>((resolve, reject) => {
      const timer = setInterval(() => {
        const now = Date.now()
        if (!isBatchStalled(lastProgressAt, now)) return
        clearInterval(timer)
        const stalledForMs = now - lastProgressAt
        console.error(
          JSON.stringify({
            event: 'batch_stalled',
            ok: false,
            round: rounds,
            stalledForMs,
            stallMs: BATCH_STALL_MS,
            lastProgressNoteId,
            attemptedNotes: attemptedIds.size,
            requestTimeoutMs: flags.requestTimeoutMs,
            hint: 'No batch progress; exiting so a wrapper can restart. Already-attempted notes stay skipped via status / --retry-failed.',
          })
        )
        reject(Object.assign(new Error('batch_stalled'), { code: 'batch_stalled' }))
      }, stallCheckMs)

      batchPromise
        .then((value) => {
          clearInterval(timer)
          resolve(value)
        })
        .catch((err) => {
          clearInterval(timer)
          reject(err)
        })
    }).catch((err) => {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'batch_stalled') {
        process.exit(1)
      }
      throw err
    })

    sessionCost += stats.costUsd
    totalMatchRows += stats.matchRows
    totalMatchedNotes += stats.matchedNotes
    const spentUsd = await sumBackfillSpendSince(sb, flags.sinceIso)
    console.log(
      JSON.stringify({
        round: rounds,
        tag: flags.tag ?? null,
        batchEstUsd: projection.batchEstUsd,
        ...stats,
        sessionCostUsd: Number(sessionCost.toFixed(6)),
        cumulativeSpendUsd: Number(spentUsd.toFixed(6)),
        totalMatchRows,
        totalMatchedNotes,
        attemptedNotes: attemptedIds.size,
        capUsd: COST_CAP_USD,
      })
    )
    if (spentUsd >= COST_CAP_USD) {
      abortIfSpendAtCap({ spentUsd, label: 'backfill-classify-match' })
    }
    // No new work, or every remaining pending note was already tried this run.
    if (stats.processed === 0) break
    if (stats.remaining === 0) break
    if (rounds > 800) {
      console.error('Stopping after 800 rounds — resume later')
      break
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      tag: flags.tag ?? null,
      since: flags.sinceDay,
      retryFailed: flags.retryFailed,
      rounds,
      sessionCostUsd: Number(sessionCost.toFixed(6)),
      cumulativeSpendUsd: Number(
        (await sumBackfillSpendSince(sb, flags.sinceIso)).toFixed(6)
      ),
      totalMatchRows,
      totalMatchedNotes,
      attemptedNotes: attemptedIds.size,
    })
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
