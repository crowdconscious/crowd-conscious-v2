/**
 * Backfill DOF notes for the last 30 business days (America/Mexico_City calendar).
 *
 * Usage:
 *   npx tsx scripts/ciceron-dof-backfill.ts
 *   npx tsx scripts/ciceron-dof-backfill.ts --days=30 --date=2026-11-10
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * OPENAI_API_KEY optional (fail-soft embeddings → embedding_pending).
 */
import { lastBusinessDays, todayInMexicoCity } from '../lib/ciceron/dof/dates'
import { runDofIngestDay, type PipelineCursor } from '../lib/ciceron/dof/pipeline'

async function ingestDayFully(targetDate: string) {
  let cursor: PipelineCursor | undefined
  let attempt = 1
  for (;;) {
    const result = await runDofIngestDay({ targetDate, cursor, attempt })
    console.log(
      `[${targetDate}] attempt=${attempt} status=${result.status} requeue=${result.requeue} ${result.message}`
    )
    if (!result.requeue) return result
    cursor = result.cursor
    attempt += 1
    if (attempt > 500) {
      throw new Error(`Gave up on ${targetDate} after ${attempt} batches`)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const daysArg = args.find((a) => a.startsWith('--days='))
  const dateArg = args.find((a) => a.startsWith('--date='))
  const days = daysArg ? Number(daysArg.split('=')[1]) : 30
  const end = dateArg ? dateArg.split('=')[1] : todayInMexicoCity()
  const dates = lastBusinessDays(end, days)

  console.log(`Backfilling ${dates.length} business days ending ${end}`)
  for (const d of dates.reverse()) {
    await ingestDayFully(d)
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
