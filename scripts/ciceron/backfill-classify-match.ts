/**
 * Backfill classification + matching for every ingested edition, oldest → newest.
 * Resumable batches. Idempotent on already-classified/matched notes when --only-pending.
 *
 * Usage:
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --dry-run --since=2026-11-12
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --since=2026-11-12 --limit=8
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --since=2026-11-12 --tag=pre-demo
 *
 * Hard US$60 cumulative cap since --since (code constant). Do NOT run against
 * production without CTO review of the dry-run estimate.
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
  sumBackfillSpendSince,
  TYPICAL_NOTE_INPUT_TOKENS,
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
    input_tokens: number | null
  }>(
    sb
      .from('ai_runs')
      .select('purpose, cost_estimate_usd, input_tokens')
      .in('purpose', ['dof_classify', 'dof_match_relevance'])
  )
  const by = new Map<string, { all: number[]; large: number[] }>()
  for (const r of rows) {
    if (r.cost_estimate_usd == null) continue
    const bucket = by.get(r.purpose) ?? { all: [], large: [] }
    const cost = Number(r.cost_estimate_usd)
    bucket.all.push(cost)
    if ((r.input_tokens ?? 0) >= TYPICAL_NOTE_INPUT_TOKENS / 2) {
      bucket.large.push(cost)
    }
    by.set(r.purpose, bucket)
  }
  return [...by.entries()].map(([purpose, costs]) => ({
    purpose,
    avgCostUsd: costs.all.reduce((a, b) => a + b, 0) / costs.all.length,
    avgCostUsdLarge:
      costs.large.length > 0
        ? costs.large.reduce((a, b) => a + b, 0) / costs.large.length
        : null,
    sampleSize: costs.all.length,
    largeSampleSize: costs.large.length,
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
  const needClassify =
    needClassifyCount ??
    pending.filter((p) => p.classify_status !== 'classified').length
  const pendingNotes = pendingCount ?? pending.length
  const classifyEst = estimateFromRates(rates, 'dof_classify', needClassify)
  // ~2 relevance calls per pending note (candidate profiles).
  const matchEst = estimateFromRates(rates, 'dof_match_relevance', pendingNotes * 2)
  const estimateUsd = Number((classifyEst + matchEst).toFixed(4))
  const editions = [...new Set(pending.map((r) => r.note_date))].sort()

  const priorSpendUsd = await sumBackfillSpendSince(sb, flags.sinceIso)
  const remainingBudgetUsd = Number((COST_CAP_USD - priorSpendUsd).toFixed(4))

  console.log(
    JSON.stringify({
      dryRun: flags.dryRun,
      since: flags.sinceDay,
      tag: flags.tag ?? null,
      ingestedNotes: ingestedCount ?? 0,
      pendingNotes,
      needClassify,
      editions,
      editionCount: editions.length,
      estimateUsd,
      classifyEst,
      matchEst,
      priorSpendUsd: Number(priorSpendUsd.toFixed(6)),
      remainingBudgetUsd,
      projectedUsd: Number((priorSpendUsd + estimateUsd).toFixed(4)),
      capUsd: COST_CAP_USD,
      ratesSampled: rates,
      note: 'Estimates floor on ~10k-token note cost when measured averages are low.',
    })
  )

  assertUnderCap({
    estimateUsd,
    dryRun: flags.dryRun,
    label: 'backfill-classify-match',
    priorSpendUsd,
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

  const batchLimit = flags.limit && flags.limit > 0 ? flags.limit : 6
  let sessionCost = 0
  let rounds = 0
  let totalMatchRows = 0
  let totalMatchedNotes = 0
  for (;;) {
    rounds += 1
    const stats = await runClassifyMatchBatch({
      limit: batchLimit,
      onlyPending: true,
    })
    sessionCost += stats.costUsd
    totalMatchRows += stats.matchRows
    totalMatchedNotes += stats.matchedNotes
    // Re-read cumulative spend from ai_runs so the cap covers prior runs too.
    const spentUsd = await sumBackfillSpendSince(sb, flags.sinceIso)
    console.log(
      JSON.stringify({
        round: rounds,
        tag: flags.tag ?? null,
        ...stats,
        sessionCostUsd: Number(sessionCost.toFixed(6)),
        cumulativeSpendUsd: Number(spentUsd.toFixed(6)),
        totalMatchRows,
        totalMatchedNotes,
        capUsd: COST_CAP_USD,
      })
    )
    abortIfSpendAtCap({ spentUsd, label: 'backfill-classify-match' })
    if (stats.remaining === 0 || stats.processed === 0) break
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
      rounds,
      sessionCostUsd: Number(sessionCost.toFixed(6)),
      cumulativeSpendUsd: Number(
        (await sumBackfillSpendSince(sb, flags.sinceIso)).toFixed(6)
      ),
      totalMatchRows,
      totalMatchedNotes,
    })
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
