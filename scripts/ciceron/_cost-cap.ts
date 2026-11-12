/**
 * Shared dry-run cost estimate helpers for Cicéron production data jobs.
 * Estimates use measured rates from ciceron.ai_runs when available.
 *
 * Hard stop: US$60. Raising the cap requires a code change (no CLI override).
 */

import { MODELS } from '../../lib/agents/config'
import { estimateAnthropicCostUsd } from '../../lib/ciceron/gateway/costs'

export const COST_CAP_USD = 60

/** Max `--limit` batch size for classify/match backfill rounds. */
export const MAX_BACKFILL_BATCH_LIMIT = 50

/**
 * Older DOF notes often send ~10k input tokens through classify/match.
 * Use this as a floor when measured averages are skewed by short notes.
 */
export const TYPICAL_NOTE_INPUT_TOKENS = 10_000
export const TYPICAL_CLASSIFY_OUTPUT_TOKENS = 800
export const TYPICAL_MATCH_OUTPUT_TOKENS = 700

export type AiRunRate = {
  purpose: string
  avgCostUsd: number
  /** Average among runs with input_tokens ≥ TYPICAL_NOTE_INPUT_TOKENS / 2. */
  avgCostUsdLarge: number | null
  sampleSize: number
  largeSampleSize: number
}

/** Loose client shape so scripts are not coupled to supabase-js generic variance. */
export type CostCapDb = {
  from: (table: string) => {
    select: (cols: string) => PromiseLike<{ data: unknown; error: unknown }> & Record<string, unknown>
  }
}

export function tokenFloorUsd(purpose: 'dof_classify' | 'dof_match_relevance'): number {
  if (purpose === 'dof_classify') {
    return estimateAnthropicCostUsd(
      MODELS.FAST,
      TYPICAL_NOTE_INPUT_TOKENS,
      TYPICAL_CLASSIFY_OUTPUT_TOKENS
    )
  }
  // One relevance call with a large note context.
  return estimateAnthropicCostUsd(
    MODELS.FAST,
    TYPICAL_NOTE_INPUT_TOKENS,
    TYPICAL_MATCH_OUTPUT_TOKENS
  )
}

/**
 * Prefer large-note measured average, else overall average floored by the
 * ~10k-token Anthropic estimate so dry-runs are not understated.
 */
export function estimateFromRates(
  rates: AiRunRate[],
  purpose: 'dof_classify' | 'dof_match_relevance',
  units: number,
  fallbackPerUnit?: number
): number {
  const hit = rates.find((r) => r.purpose === purpose && r.sampleSize >= 3)
  const floor = fallbackPerUnit ?? tokenFloorUsd(purpose)
  const measured =
    hit?.avgCostUsdLarge && hit.largeSampleSize >= 3
      ? hit.avgCostUsdLarge
      : hit?.avgCostUsd
  const per = Math.max(measured ?? 0, floor)
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
  /** Already spent under the same --since window (cumulative). */
  priorSpendUsd?: number
}): void {
  const prior = opts.priorSpendUsd ?? 0
  const projected = prior + opts.estimateUsd
  if (projected <= COST_CAP_USD) return
  const payload = {
    ok: false as const,
    error: 'over_cap',
    label: opts.label,
    estimateUsd: opts.estimateUsd,
    priorSpendUsd: prior,
    projectedUsd: Number(projected.toFixed(4)),
    capUsd: COST_CAP_USD,
    hint: 'Hard cap is US$60 cumulative since --since. Edit COST_CAP_USD in _cost-cap.ts if CTO approves.',
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
  const limitRaw = argv.find((a) => a.startsWith('--limit='))?.split('=')[1]
  let limit: number | undefined
  if (limitRaw !== undefined) {
    if (!/^\d+$/.test(limitRaw.trim())) {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'invalid_limit',
          hint: `--limit must be a positive integer ≤ ${MAX_BACKFILL_BATCH_LIMIT}`,
        })
      )
      process.exit(1)
    }
    limit = Number(limitRaw)
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BACKFILL_BATCH_LIMIT) {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'limit_out_of_range',
          limit,
          max: MAX_BACKFILL_BATCH_LIMIT,
          hint: `--limit must be between 1 and ${MAX_BACKFILL_BATCH_LIMIT}`,
        })
      )
      process.exit(1)
    }
  }

  const sinceRaw = argv.find((a) => a.startsWith('--since='))?.split('=')[1]?.trim()
  let sinceIso: string | undefined
  if (sinceRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sinceRaw)) {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'invalid_since',
          hint: '--since must be YYYY-MM-DD (America/Mexico_City calendar day).',
        })
      )
      process.exit(1)
    }
    // CDMX midnight as UTC instant (UTC−6 year-round).
    sinceIso = `${sinceRaw}T06:00:00.000Z`
  }

  const tag = argv.find((a) => a.startsWith('--tag='))?.split('=')[1]?.trim() || undefined

  return {
    dryRun: argv.includes('--dry-run'),
    limit,
    sinceIso,
    sinceDay: sinceRaw,
    tag,
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

/**
 * Sum measured classify/match spend since an instant (cumulative across runs).
 * Optional tag is matched against ai_runs purpose suffix… not available without
 * a column — instead we accept tag only as a log label and filter by since.
 */
export async function sumBackfillSpendSince(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  sinceIso: string
): Promise<number> {
  const rows = await fetchAllRows<{ cost_estimate_usd: number | null }>(
    sb
      .from('ai_runs')
      .select('cost_estimate_usd')
      .in('purpose', ['dof_classify', 'dof_match_relevance'])
      .gte('created_at', sinceIso)
  )
  return rows.reduce((s, r) => s + (Number(r.cost_estimate_usd) || 0), 0)
}
