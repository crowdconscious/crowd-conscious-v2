/**
 * Classify + match already-ingested DOF notes (Prompt 4 backlog).
 *
 * Usage:
 *   npx tsx scripts/ciceron-dof-classify-match.ts
 *   npx tsx scripts/ciceron-dof-classify-match.ts --limit=20
 *   npx tsx scripts/ciceron-dof-classify-match.ts --date=2026-11-10
 *   npx tsx scripts/ciceron-dof-classify-match.ts --all-pending
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.
 * OPENAI_API_KEY optional (vector stage fails soft).
 */
import { runClassifyMatchBatch } from '../lib/ciceron/dof/classify-match'

async function main() {
  const args = process.argv.slice(2)
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const dateArg = args.find((a) => a.startsWith('--date='))
  const allPending = args.includes('--all-pending')
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 8
  const noteDate = dateArg ? dateArg.split('=')[1] : undefined

  let totalCost = 0
  let rounds = 0
  for (;;) {
    rounds += 1
    const stats = await runClassifyMatchBatch({
      limit,
      noteDate,
      onlyPending: true,
    })
    totalCost += stats.costUsd
    console.log(
      JSON.stringify({
        round: rounds,
        ...stats,
        totalCostUsd: Number(totalCost.toFixed(6)),
      })
    )
    if (!allPending || stats.remaining === 0 || stats.processed === 0) break
    if (rounds > 500) {
      console.error('Stopping after 500 rounds')
      break
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
