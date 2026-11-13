/**
 * Backfill classification + matching for every ingested edition, oldest → newest.
 * Resumable batches. Idempotent on already-classified/matched notes when --only-pending.
 *
 * Shared batch logic lives in lib/ciceron/dof/backfill-batch.ts (also used by
 * /api/ciceron/cron/backfill). This script keeps the stall watchdog for box runs.
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
import { runBackfillBatches } from '../../lib/ciceron/dof/backfill-batch'
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
  loadRecentBackfillRates,
  parseFlags,
  perNoteCostFromRates,
  sumBackfillSpendSince,
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

  const [
    { count: ingestedCount, error: ingestedErr },
    { count: pendingCount, error: pendingErr },
  ] = await Promise.all([
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

  const rates = await loadRecentBackfillRates(sb)
  const sample = perNoteCostFromRates(rates)
  const pendingNotes = pendingCount ?? pending.length
  const needClassify =
    needClassifyCount ??
    pending.filter(
      (p) =>
        p.classify_status === 'pending' ||
        (flags.retryFailed && p.classify_status === 'failed')
    ).length
  const estimateUsd = estimateNotesUsd({
    pendingNotes,
    perNoteUsd: sample.perNoteUsd,
  })
  const editions = [...new Set(pending.map((r) => r.note_date))].sort()

  const priorSpendUsd = await sumBackfillSpendSince(sb, flags.sinceIso)
  const remainingBudgetUsd = Number((COST_CAP_USD - priorSpendUsd).toFixed(4))

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

  const attemptedIds = new Set<string>()
  let lastProgressAt = Date.now()
  let lastProgressNoteId: string | null = null
  const stallCheckMs = Math.min(
    15_000,
    Math.max(1_000, Math.floor(BATCH_STALL_MS / 20))
  )

  const stallTimer = setInterval(() => {
    const now = Date.now()
    if (!isBatchStalled(lastProgressAt, now)) return
    clearInterval(stallTimer)
    console.error(
      JSON.stringify({
        event: 'batch_stalled',
        ok: false,
        stalledForMs: now - lastProgressAt,
        stallMs: BATCH_STALL_MS,
        lastProgressNoteId,
        attemptedNotes: attemptedIds.size,
        requestTimeoutMs: flags.requestTimeoutMs,
        hint: 'No batch progress; exiting so a wrapper can restart. Already-attempted notes stay skipped via status / --retry-failed.',
      })
    )
    process.exit(1)
  }, stallCheckMs)

  try {
    const totals = await runBackfillBatches({
      sinceIso: flags.sinceIso,
      tag: flags.tag ?? 'pre-demo',
      retryFailed: flags.retryFailed,
      batchLimit: flags.limit && flags.limit > 0 ? flags.limit : 6,
      wallClockMs: null,
      requestTimeoutMs: flags.requestTimeoutMs,
      useClaims: false,
      excludeIds: attemptedIds,
      onProgress: ({ noteId }) => {
        lastProgressAt = Date.now()
        lastProgressNoteId = noteId
        attemptedIds.add(noteId)
      },
    })

    clearInterval(stallTimer)

    if (totals.stopReason === 'spend_cap_reached') {
      abortIfSpendAtCap({
        spentUsd: totals.cumulativeSpendUsd,
        label: 'backfill-classify-match',
      })
    }

    console.log(
      JSON.stringify({
        ok: true,
        tag: flags.tag ?? null,
        since: flags.sinceDay,
        retryFailed: flags.retryFailed,
        rounds: totals.rounds,
        sessionCostUsd: totals.sessionCostUsd,
        cumulativeSpendUsd: totals.cumulativeSpendUsd,
        totalMatchRows: totals.matches,
        totalMatchedNotes: totals.matchedNotes,
        processed: totals.processed,
        classified: totals.classified,
        failed: totals.failed,
        remaining: totals.remaining,
        done: totals.done,
        stopReason: totals.stopReason,
        attemptedNotes: attemptedIds.size,
        capUsd: COST_CAP_USD,
      })
    )
  } catch (err) {
    clearInterval(stallTimer)
    throw err
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
