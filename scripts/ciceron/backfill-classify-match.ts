/**
 * Backfill classification + matching for every ingested edition, oldest → newest.
 * Resumable batches. Idempotent on already-classified/matched notes when --only-pending.
 *
 * Usage:
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --dry-run
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --limit=8
 *
 * Hard US$60 cap (code constant). Do NOT run against production without CTO review
 * of the dry-run estimate. Raising the cap requires editing _cost-cap.ts.
 */
import { createClient } from '@supabase/supabase-js'
import { runClassifyMatchBatch } from '../../lib/ciceron/dof/classify-match'
import {
  abortIfSpendAtCap,
  assertUnderCap,
  COST_CAP_USD,
  estimateFromRates,
  fetchAllRows,
  parseFlags,
  type AiRunRate,
} from './_cost-cap'

type NoteRow = {
  id: string
  note_date: string
  classify_status: string
  match_status: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadRates(sb: any): Promise<AiRunRate[]> {
  const rows = await fetchAllRows<{
    purpose: string
    cost_estimate_usd: number | null
  }>(
    sb
      .from('ai_runs')
      .select('purpose, cost_estimate_usd')
      .in('purpose', ['dof_classify', 'dof_match_relevance'])
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
  const sb = createClient(url, key, { db: { schema: 'ciceron' } })

  // Exact counts (head) so the estimate is not capped by PostgREST's 1000-row page.
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
        .or(
          'classify_status.in.(pending,failed),match_status.in.(pending,failed)'
        ),
    ])
  if (ingestedErr || pendingErr) {
    console.error(ingestedErr?.message ?? pendingErr?.message)
    process.exit(1)
  }

  const { count: needClassifyCount, error: classifyErr } = await sb
    .from('dof_notes')
    .select('id', { count: 'exact', head: true })
    .in('ingest_status', ['ready', 'embedding_pending'])
    .in('classify_status', ['pending', 'failed'])
  if (classifyErr) {
    console.error(classifyErr.message)
    process.exit(1)
  }

  // Page all pending rows for edition list (and pendingNotes accuracy).
  const pending = await fetchAllRows<NoteRow>(
    sb
      .from('dof_notes')
      .select('id, note_date, classify_status, match_status')
      .in('ingest_status', ['ready', 'embedding_pending'])
      .or(
        'classify_status.in.(pending,failed),match_status.in.(pending,failed)'
      )
      .order('note_date', { ascending: true })
  )

  const rates = await loadRates(sb)
  const needClassify = needClassifyCount ?? pending.filter((p) => p.classify_status !== 'classified').length
  const pendingNotes = pendingCount ?? pending.length
  const classifyEst = estimateFromRates(rates, 'dof_classify', needClassify, 0.004)
  // One relevance call per pending note × watch-profile candidate batch ≈ 2 avg
  const matchEst = estimateFromRates(rates, 'dof_match_relevance', pendingNotes * 2, 0.006)
  const estimateUsd = Number((classifyEst + matchEst).toFixed(4))
  const editions = [...new Set(pending.map((r) => r.note_date))].sort()

  console.log(
    JSON.stringify({
      dryRun: flags.dryRun,
      ingestedNotes: ingestedCount ?? 0,
      pendingNotes,
      needClassify,
      editions,
      editionCount: editions.length,
      estimateUsd,
      classifyEst,
      matchEst,
      capUsd: COST_CAP_USD,
      ratesSampled: rates,
    })
  )

  assertUnderCap({
    estimateUsd,
    dryRun: flags.dryRun,
    label: 'backfill-classify-match',
  })

  if (flags.dryRun) {
    console.log(JSON.stringify({ ok: true, skipped: 'dry-run' }))
    return
  }

  const batchLimit = flags.limit && flags.limit > 0 ? flags.limit : 6
  let totalCost = 0
  let rounds = 0
  for (;;) {
    rounds += 1
    const stats = await runClassifyMatchBatch({
      limit: batchLimit,
      onlyPending: true,
    })
    totalCost += stats.costUsd
    console.log(
      JSON.stringify({
        round: rounds,
        ...stats,
        totalCostUsd: Number(totalCost.toFixed(6)),
        capUsd: COST_CAP_USD,
      })
    )
    abortIfSpendAtCap({ spentUsd: totalCost, label: 'backfill-classify-match' })
    if (stats.remaining === 0 || stats.processed === 0) break
    if (rounds > 800) {
      console.error('Stopping after 800 rounds — resume later')
      break
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
