/**
 * Shared dry-run cost estimate helpers for Cicéron production data jobs.
 * Estimates use measured rates from ciceron.ai_runs when available.
 */

export const COST_CAP_USD = 60

export type AiRunRate = {
  purpose: string
  avgCostUsd: number
  sampleSize: number
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

export function assertUnderCap(opts: {
  estimateUsd: number
  dryRun: boolean
  confirmOverCap: boolean
  label: string
}): void {
  if (opts.estimateUsd <= COST_CAP_USD) return
  // Dry-run always prints the estimate; the hard stop applies to live runs.
  if (opts.dryRun) {
    console.warn(
      JSON.stringify({
        ok: true,
        warning: 'over_cap',
        label: opts.label,
        estimateUsd: opts.estimateUsd,
        capUsd: COST_CAP_USD,
        hint: 'Live run will require --confirm-over-cap.',
      })
    )
    return
  }
  if (opts.confirmOverCap) return
  console.error(
    JSON.stringify({
      ok: false,
      error: 'over_cap',
      label: opts.label,
      estimateUsd: opts.estimateUsd,
      capUsd: COST_CAP_USD,
      hint: 'Re-run with --confirm-over-cap after reviewing the estimate.',
    })
  )
  process.exit(2)
}

export function parseFlags(argv: string[]) {
  return {
    dryRun: argv.includes('--dry-run'),
    confirmOverCap: argv.includes('--confirm-over-cap'),
    limit: (() => {
      const raw = argv.find((a) => a.startsWith('--limit='))?.split('=')[1]
      return raw ? Number(raw) : undefined
    })(),
  }
}
