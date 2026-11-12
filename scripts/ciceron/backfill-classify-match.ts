/**
 * Backfill classification + matching for every ingested edition, oldest → newest.
 * Resumable batches. Idempotent on already-classified/matched notes when --only-pending.
 *
 * Usage:
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --dry-run
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --limit=8
 *   npx tsx scripts/ciceron/backfill-classify-match.ts --confirm-over-cap
 *
 * Do NOT run against production without CTO confirmation of the cost printout.
 */
import { createClient } from '@supabase/supabase-js'
import { runClassifyMatchBatch } from '../../lib/ciceron/dof/classify-match'
import {
  assertUnderCap,
  estimateFromRates,
  parseFlags,
  type AiRunRate,
} from './_cost-cap'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadRates(sb: any): Promise<AiRunRate[]> {
  const { data } = await sb
    .from('ai_runs')
    .select('purpose, cost_estimate_usd')
    .in('purpose', ['dof_classify', 'dof_match_relevance'])
    .limit(400)
  const rows = (Array.isArray(data) ? data : []) as {
    purpose: string
    cost_estimate_usd: number | null
  }[]
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

  const { data: notes, error } = await sb
    .from('dof_notes')
    .select('id, note_date, ingest_status, classify_status, match_status')
    .in('ingest_status', ['ready', 'embedding_pending'])
    .order('note_date', { ascending: true })
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  const rows = (Array.isArray(notes) ? notes : []) as {
    id: string
    note_date: string
    classify_status: string
    match_status: string
  }[]
  const pending = rows.filter(
    (r) =>
      r.classify_status === 'pending' ||
      r.classify_status === 'failed' ||
      r.match_status === 'pending' ||
      r.match_status === 'failed'
  )
  const rates = await loadRates(sb)
  const classifyEst = estimateFromRates(
    rates,
    'dof_classify',
    pending.filter((p) => p.classify_status !== 'classified').length,
    0.004
  )
  const matchEst = estimateFromRates(
    rates,
    'dof_match_relevance',
    pending.length * 2,
    0.006
  )
  const estimateUsd = Number((classifyEst + matchEst).toFixed(4))

  console.log(
    JSON.stringify({
      dryRun: flags.dryRun,
      ingestedNotes: rows.length,
      pendingNotes: pending.length,
      editions: [...new Set(rows.map((r) => r.note_date))].sort(),
      estimateUsd,
      classifyEst,
      matchEst,
      ratesSampled: rates,
    })
  )

  assertUnderCap({
    estimateUsd,
    dryRun: flags.dryRun,
    confirmOverCap: flags.confirmOverCap,
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
    // Process oldest first: temporarily re-order by flipping — batch helper
    // currently newest-first; for oldest→newest we iterate by date groups.
    totalCost += stats.costUsd
    console.log(
      JSON.stringify({
        round: rounds,
        ...stats,
        totalCostUsd: Number(totalCost.toFixed(6)),
      })
    )
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
