/**
 * CLI wrappers around lib/ciceron/dof/backfill-cost.ts for box scripts.
 * Prefer importing from lib for app/route code.
 */

import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  parseRequestTimeoutMs,
} from '../../lib/ciceron/gateway/request-timeout'
import {
  COST_CAP_USD,
  ESTIMATE_MARGIN,
  FALLBACK_PER_NOTE_USD,
  MAX_BACKFILL_BATCH_LIMIT,
  TYPICAL_CLASSIFY_OUTPUT_TOKENS,
  TYPICAL_MATCH_OUTPUT_TOKENS,
  TYPICAL_NOTE_INPUT_TOKENS,
  estimateFromRates,
  estimateNotesUsd,
  fetchAllRows,
  isSpendAtCap,
  loadRecentBackfillRates,
  perNoteCostFromRates,
  projectBatchAffordable,
  sumBackfillSpendSince,
  tokenFloorUsd,
  type AiRunRate,
  type PerNoteCostSample,
} from '../../lib/ciceron/dof/backfill-cost'

export {
  COST_CAP_USD,
  ESTIMATE_MARGIN,
  FALLBACK_PER_NOTE_USD,
  MAX_BACKFILL_BATCH_LIMIT,
  TYPICAL_CLASSIFY_OUTPUT_TOKENS,
  TYPICAL_MATCH_OUTPUT_TOKENS,
  TYPICAL_NOTE_INPUT_TOKENS,
  estimateFromRates,
  estimateNotesUsd,
  fetchAllRows,
  isSpendAtCap,
  loadRecentBackfillRates,
  perNoteCostFromRates,
  projectBatchAffordable,
  sumBackfillSpendSince,
  tokenFloorUsd,
  type AiRunRate,
  type PerNoteCostSample,
}

/** Loose client shape so scripts are not coupled to supabase-js generic variance. */
export type CostCapDb = {
  from: (table: string) => {
    select: (cols: string) => PromiseLike<{ data: unknown; error: unknown }> &
      Record<string, unknown>
  }
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
  if (!isSpendAtCap(opts.spentUsd)) return
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
        hint: 'US$60 is a hard code cap. Edit COST_CAP_USD in lib/ciceron/dof/backfill-cost.ts if CTO approves a higher budget.',
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
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_BACKFILL_BATCH_LIMIT
    ) {
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

  const sinceRaw = argv
    .find((a) => a.startsWith('--since='))
    ?.split('=')[1]
    ?.trim()
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

  const tag =
    argv.find((a) => a.startsWith('--tag='))?.split('=')[1]?.trim() || undefined

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
