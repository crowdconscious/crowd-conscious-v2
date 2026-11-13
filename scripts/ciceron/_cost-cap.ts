/**
 * Shared dry-run cost estimate helpers for Cicéron production data jobs.
 * Estimates use measured rates from ciceron.ai_runs when available.
 *
 * Hard stop: US$60 cumulative spend. Raising the cap requires a code change
 * (no CLI override). Pre-flight estimate over the cap is a warning for
 * backfill — the live loop stops before a batch that would overshoot.
 */

import { MODELS } from '../../lib/agents/config'
import { estimateAnthropicCostUsd } from '../../lib/ciceron/gateway/costs'
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  parseRequestTimeoutMs,
} from '../../lib/ciceron/gateway/request-timeout'

export const COST_CAP_USD = 60

/** Max `--limit` batch size for classify/match backfill rounds. */
export const MAX_BACKFILL_BATCH_LIMIT = 50

/** Modest uplift on measured per-note cost for dry-run / batch projection. */
export const ESTIMATE_MARGIN = 1.15

/** Fallback when ai_runs has too few samples (≈ today's measured blend). */
export const FALLBACK_PER_NOTE_USD = 0.012

export const TYPICAL_NOTE_INPUT_TOKENS = 10_000
export const TYPICAL_CLASSIFY_OUTPUT_TOKENS = 800
export const TYPICAL_MATCH_OUTPUT_TOKENS = 700

export type AiRunRate = {
  purpose: string
  avgCostUsd: number
  sampleSize: number
  /** Present when caller also buckets large-token runs. */
  avgCostUsdLarge?: number | null
  largeSampleSize?: number
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
  return estimateAnthropicCostUsd(
    MODELS.FAST,
    TYPICAL_NOTE_INPUT_TOKENS,
    TYPICAL_MATCH_OUTPUT_TOKENS
  )
}

/**
 * Generic unit estimate for any purpose (embed, classify, match, …).
 * Uses measured average when sampleSize ≥ 3; otherwise `fallbackPerUnit`.
 */
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

export type PerNoteCostSample = {
  perNoteUsd: number
  matchCallsPerNote: number
  classifyCalls: number
  matchCalls: number
  totalUsd: number
  windowDays: number
}

/**
 * Measured blend: (classify + match spend) / classify calls over recent days.
 * Matches ops observation (~1.1 match calls, ~$0.0117 / note).
 */
export function perNoteCostFromRates(
  rates: AiRunRate[],
  opts?: { matchCallsPerNoteFallback?: number }
): PerNoteCostSample {
  const classify = rates.find((r) => r.purpose === 'dof_classify')
  const match = rates.find((r) => r.purpose === 'dof_match_relevance')
  const matchCallsPerNoteFallback = opts?.matchCallsPerNoteFallback ?? 1.1

  const classifyAvg = classify && classify.sampleSize >= 3 ? classify.avgCostUsd : null
  const matchAvg = match && match.sampleSize >= 3 ? match.avgCostUsd : null

  // Infer match/classify ratio from sample sizes when both exist.
  let matchCallsPerNote = matchCallsPerNoteFallback
  if (
    classify &&
    match &&
    classify.sampleSize >= 3 &&
    match.sampleSize >= 3
  ) {
    matchCallsPerNote = match.sampleSize / classify.sampleSize
  }

  let perNoteUsd = FALLBACK_PER_NOTE_USD
  if (classifyAvg != null && matchAvg != null) {
    perNoteUsd = classifyAvg + matchCallsPerNote * matchAvg
  } else if (classifyAvg != null) {
    perNoteUsd = classifyAvg + matchCallsPerNote * (matchAvg ?? tokenFloorUsd('dof_match_relevance') * 0.25)
  }

  return {
    perNoteUsd: Number(perNoteUsd.toFixed(6)),
    matchCallsPerNote: Number(matchCallsPerNote.toFixed(3)),
    classifyCalls: classify?.sampleSize ?? 0,
    matchCalls: match?.sampleSize ?? 0,
    totalUsd: Number(
      (
        (classifyAvg ?? 0) * (classify?.sampleSize ?? 0) +
        (matchAvg ?? 0) * (match?.sampleSize ?? 0)
      ).toFixed(6)
    ),
    windowDays: 0,
  }
}

export function estimateNotesUsd(opts: {
  pendingNotes: number
  perNoteUsd: number
  margin?: number
}): number {
  const margin = opts.margin ?? ESTIMATE_MARGIN
  return Number((opts.pendingNotes * opts.perNoteUsd * margin).toFixed(4))
}

/**
 * Warn when estimate exceeds cap. Live backfill may continue — the loop
 * stops before a batch that would overshoot. Set `hard: true` to exit (embed).
 */
export function assertUnderCap(opts: {
  estimateUsd: number
  dryRun: boolean
  label: string
  priorSpendUsd?: number
  /** When true, refuse to start a live run over the projected total. */
  hard?: boolean
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
    hint: 'Hard spend stop is the cumulative US$60 cap during the live loop.',
  }
  if (opts.dryRun || !opts.hard) {
    console.warn(
      JSON.stringify({
        ...payload,
        ok: true,
        warning: 'over_cap',
        willStart: !opts.dryRun,
        note: opts.dryRun
          ? 'Dry-run only — live run can start and stop at the cumulative cap.'
          : 'Starting anyway; each batch is projected against remaining budget.',
      })
    )
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

/**
 * Before starting a batch: stop cleanly if even one note at measured cost
 * would push past the remaining budget (avoids overshoot).
 */
export function projectBatchAffordable(opts: {
  spentUsd: number
  batchLimit: number
  perNoteUsd: number
  margin?: number
  label: string
}): { ok: true; batchLimit: number; batchEstUsd: number } | { ok: false; reason: string; remainingBudgetUsd: number } {
  const margin = opts.margin ?? ESTIMATE_MARGIN
  const remaining = COST_CAP_USD - opts.spentUsd
  const unit = opts.perNoteUsd * margin
  if (remaining <= 0 || unit <= 0 || remaining < unit) {
    return {
      ok: false,
      reason: 'batch_would_exceed_cap',
      remainingBudgetUsd: Number(remaining.toFixed(6)),
    }
  }
  const maxNotes = Math.max(1, Math.floor(remaining / unit))
  const batchLimit = Math.min(opts.batchLimit, maxNotes)
  return {
    ok: true,
    batchLimit,
    batchEstUsd: Number((batchLimit * unit).toFixed(4)),
  }
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

  const timeoutRaw = argv
    .find((a) => a.startsWith('--request-timeout-ms='))
    ?.split('=')[1]
  let requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
  if (timeoutRaw !== undefined) {
    try {
      requestTimeoutMs = parseRequestTimeoutMs(timeoutRaw)
    } catch {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'invalid_request_timeout_ms',
          hint: '--request-timeout-ms must be a positive integer (milliseconds).',
        })
      )
      process.exit(1)
    }
  }

  return {
    dryRun: argv.includes('--dry-run'),
    limit,
    sinceIso,
    sinceDay: sinceRaw,
    tag,
    retryFailed: argv.includes('--retry-failed'),
    requestTimeoutMs,
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

/** Sum measured classify/match spend since an instant (cumulative across runs). */
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
