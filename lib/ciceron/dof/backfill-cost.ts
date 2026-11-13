/**
 * Shared cost-cap helpers for Cicéron DOF classify/match backfill.
 * Used by the box script and the serverless cron route.
 *
 * Hard stop: US$60 cumulative spend since the pre-demo epoch.
 * Raising the cap requires a code change (no env/CLI override).
 */

import { MODELS } from '@/lib/agents/config'
import { estimateAnthropicCostUsd } from '@/lib/ciceron/gateway/costs'

export const COST_CAP_USD = 60

/** Max batch size for classify/match backfill rounds. */
export const MAX_BACKFILL_BATCH_LIMIT = 50

/** Modest uplift on measured per-note cost for dry-run / batch projection. */
export const ESTIMATE_MARGIN = 1.15

/** Fallback when ai_runs has too few samples (≈ measured blend). */
export const FALLBACK_PER_NOTE_USD = 0.012

export const TYPICAL_NOTE_INPUT_TOKENS = 10_000
export const TYPICAL_CLASSIFY_OUTPUT_TOKENS = 800
export const TYPICAL_MATCH_OUTPUT_TOKENS = 700

/** Pre-demo backfill epoch (America/Mexico_City calendar day → UTC−6 midnight). */
export const BACKFILL_SINCE_DAY = '2026-11-12'
export const BACKFILL_SINCE_ISO = `${BACKFILL_SINCE_DAY}T06:00:00.000Z`
export const BACKFILL_TAG = 'pre-demo'

/** Purposes counted toward the US$60 cumulative backfill cap. */
export const BACKFILL_SPEND_PURPOSES = [
  'dof_classify',
  'dof_match_relevance',
] as const

export type AiRunRate = {
  purpose: string
  avgCostUsd: number
  sampleSize: number
  avgCostUsdLarge?: number | null
  largeSampleSize?: number
}

export function tokenFloorUsd(
  purpose: 'dof_classify' | 'dof_match_relevance'
): number {
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
 */
export function perNoteCostFromRates(
  rates: AiRunRate[],
  opts?: { matchCallsPerNoteFallback?: number }
): PerNoteCostSample {
  const classify = rates.find((r) => r.purpose === 'dof_classify')
  const match = rates.find((r) => r.purpose === 'dof_match_relevance')
  const matchCallsPerNoteFallback = opts?.matchCallsPerNoteFallback ?? 1.1

  const classifyAvg =
    classify && classify.sampleSize >= 3 ? classify.avgCostUsd : null
  const matchAvg = match && match.sampleSize >= 3 ? match.avgCostUsd : null

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
    perNoteUsd =
      classifyAvg +
      matchCallsPerNote *
        (matchAvg ?? tokenFloorUsd('dof_match_relevance') * 0.25)
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
 * Before starting a batch: stop cleanly if even one note at measured cost
 * would push past the remaining budget (avoids overshoot).
 */
export function projectBatchAffordable(opts: {
  spentUsd: number
  batchLimit: number
  perNoteUsd: number
  margin?: number
  capUsd?: number
}):
  | { ok: true; batchLimit: number; batchEstUsd: number }
  | { ok: false; reason: 'batch_would_exceed_cap'; remainingBudgetUsd: number } {
  const cap = opts.capUsd ?? COST_CAP_USD
  const margin = opts.margin ?? ESTIMATE_MARGIN
  const remaining = cap - opts.spentUsd
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

/** True when measured spend has reached the hard cap. */
export function isSpendAtCap(
  spentUsd: number,
  capUsd: number = COST_CAP_USD
): boolean {
  return spentUsd >= capUsd
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

/** Loose client so scripts and the admin schema client both type-check. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpendClient = any

/**
 * Sum measured classify/match spend since an instant (cumulative across runs).
 * Prefers aggregate RPC when migration 329 is applied; falls back to paged select.
 */
export async function sumBackfillSpendSince(
  sb: SpendClient,
  sinceIso: string
): Promise<number> {
  if (typeof sb.rpc === 'function') {
    const { data, error } = await sb.rpc('dof_backfill_spend_since', {
      p_since: sinceIso,
    })
    if (!error) {
      const n = Number(data)
      if (Number.isFinite(n) && n >= 0) return n
    }
  }

  const rows = await fetchAllRows<{ cost_estimate_usd: number | null }>(
    sb
      .from('ai_runs')
      .select('cost_estimate_usd')
      .in('purpose', [...BACKFILL_SPEND_PURPOSES])
      .gte('created_at', sinceIso)
  )
  return rows.reduce((s, r) => s + (Number(r.cost_estimate_usd) || 0), 0)
}

/** Prefer last ~2 days of runs so the estimate tracks the current corpus. */
export async function loadRecentBackfillRates(
  sb: SpendClient
): Promise<AiRunRate[]> {
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const rows = await fetchAllRows<{
    purpose: string
    cost_estimate_usd: number | null
  }>(
    sb
      .from('ai_runs')
      .select('purpose, cost_estimate_usd')
      .in('purpose', [...BACKFILL_SPEND_PURPOSES])
      .gte('created_at', since)
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
