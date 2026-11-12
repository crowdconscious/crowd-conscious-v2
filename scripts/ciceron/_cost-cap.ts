/**
 * Shared dry-run cost estimate helpers for Cicéron production data jobs.
 * Estimates use measured rates from ciceron.ai_runs when available.
 *
 * Hard stop: US$60. Raising the cap requires a code change (no CLI override).
 */

export const COST_CAP_USD = 60

export type AiRunRate = {
  purpose: string
  avgCostUsd: number
  sampleSize: number
}

/** Loose client shape so scripts are not coupled to supabase-js generic variance. */
export type CostCapDb = {
  from: (table: string) => {
    select: (cols: string) => PromiseLike<{ data: unknown; error: unknown }> & Record<string, unknown>
  }
}

export function estimateFromRates(
  rates: AiRunRate[],
  purpose: string,
  units: number,
  fallbackPerUnit: number
): number {
  const hit = rates.find((r) => r.purpose === purpose && r.sampleSize >= 3)
  const per = hit?.avgCostUsd ?? fallbackPerUnit
  return Number((per * units).toFixed(4))
}

/**
 * Refuse to start a live run when the pre-flight estimate exceeds the hard cap.
 * Dry-run still prints a warning so ops can see the number.
 */
export function assertUnderCap(opts: {
  estimateUsd: number
  dryRun: boolean
  label: string
}): void {
  if (opts.estimateUsd <= COST_CAP_USD) return
  const payload = {
    ok: false as const,
    error: 'over_cap',
    label: opts.label,
    estimateUsd: opts.estimateUsd,
    capUsd: COST_CAP_USD,
    hint: 'Hard cap is US$60 in scripts/ciceron/_cost-cap.ts — raise it in code if CTO approves.',
  }
  if (opts.dryRun) {
    console.warn(JSON.stringify({ ...payload, ok: true, warning: 'over_cap' }))
    return
  }
  console.error(JSON.stringify(payload))
  process.exit(2)
}

/** Abort a live loop once cumulative measured spend reaches the hard cap. */
export function abortIfSpendAtCap(opts: {
  spentUsd: number
  label: string
}): void {
  if (opts.spentUsd < COST_CAP_USD) return
  console.error(
    JSON.stringify({
      ok: false,
      error: 'spend_cap_reached',
      label: opts.label,
      spentUsd: Number(opts.spentUsd.toFixed(6)),
      capUsd: COST_CAP_USD,
    })
  )
  process.exit(2)
}

export function parseFlags(argv: string[]) {
  if (argv.includes('--confirm-over-cap')) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'confirm_over_cap_removed',
        hint: 'US$60 is a hard code cap. Edit COST_CAP_USD in _cost-cap.ts if CTO approves a higher budget.',
      })
    )
    process.exit(2)
  }
  return {
    dryRun: argv.includes('--dry-run'),
    limit: (() => {
      const raw = argv.find((a) => a.startsWith('--limit='))?.split('=')[1]
      return raw ? Number(raw) : undefined
    })(),
  }
}

/** Page through a PostgREST select until exhausted (default max 1000/page). */
export async function fetchAllRows<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  pageSize = 1000
): Promise<T[]> {
  const out: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await query.range(from, from + pageSize - 1)
    if (error) throw new Error(String(error.message ?? error))
    const rows = (Array.isArray(data) ? data : []) as T[]
    out.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }
  return out
}
