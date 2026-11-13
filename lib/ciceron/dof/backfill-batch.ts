/**
 * Shared per-batch orchestration for DOF classify/match backfill.
 * Used by scripts/ciceron/backfill-classify-match.ts and the serverless cron.
 *
 * Each batch: check spend vs cap → claim (optional) → classify/match → tally.
 * The cron loops batches until ~240s elapsed; the script loops until empty/cap.
 */

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import {
  claimBackfillNotes,
  releaseBackfillClaim,
} from '@/lib/ciceron/dof/backfill-claim'
import {
  BACKFILL_SINCE_ISO,
  BACKFILL_TAG,
  COST_CAP_USD,
  isSpendAtCap,
  loadRecentBackfillRates,
  perNoteCostFromRates,
  projectBatchAffordable,
  sumBackfillSpendSince,
} from '@/lib/ciceron/dof/backfill-cost'
import {
  countPendingClassifyMatchNotes,
  runClassifyMatchBatch,
  type ClassifyMatchStats,
} from '@/lib/ciceron/dof/classify-match'
import { setCompleteRequestPolicy } from '@/lib/ciceron/gateway/complete'
import { DEFAULT_REQUEST_TIMEOUT_MS } from '@/lib/ciceron/gateway/request-timeout'

/** Leave headroom under Vercel maxDuration=300s. */
export const BACKFILL_WALL_CLOCK_MS = 240_000

/** Default notes per serverless/script batch round. */
export const DEFAULT_BACKFILL_BATCH_LIMIT = 6

export type BackfillStopReason =
  | 'batch_would_exceed_cap'
  | 'spend_cap_reached'
  | 'wall_clock'
  | 'no_work'
  | 'done'
  | 'disabled'
  | 'no_db'

export type BackfillBatchTotals = {
  processed: number
  classified: number
  failed: number
  matches: number
  matchedNotes: number
  remaining: number
  cumulativeSpendUsd: number
  capUsd: number
  sessionCostUsd: number
  rounds: number
  done: boolean
  stopReason: BackfillStopReason | null
  tag: string
  sinceIso: string
}

export type RunBackfillBatchesOpts = {
  sinceIso?: string
  tag?: string
  retryFailed?: boolean
  batchLimit?: number
  /** Stop starting new batches after this elapsed ms (default 240s for cron). */
  wallClockMs?: number | null
  requestTimeoutMs?: number
  /** Claim rows so overlapping invocations cannot double-process. */
  useClaims?: boolean
  /** Script-only: skip notes already attempted this process. */
  excludeIds?: Set<string>
  onProgress?: (info: { noteId: string; phase: 'start' | 'done' }) => void
  /** Injected clock for tests. */
  now?: () => number
  /** Max rounds (safety). Default 800 for script, 40 for wall-clock runs. */
  maxRounds?: number
}

function emptyTotals(
  sinceIso: string,
  tag: string,
  spent: number
): BackfillBatchTotals {
  return {
    processed: 0,
    classified: 0,
    failed: 0,
    matches: 0,
    matchedNotes: 0,
    remaining: 0,
    cumulativeSpendUsd: Number(spent.toFixed(6)),
    capUsd: COST_CAP_USD,
    sessionCostUsd: 0,
    rounds: 0,
    done: false,
    stopReason: null,
    tag,
    sinceIso,
  }
}

function mergeStats(
  totals: BackfillBatchTotals,
  stats: ClassifyMatchStats
): void {
  totals.processed += stats.processed
  totals.classified += stats.classified
  totals.failed += stats.classifyFailed
  totals.matches += stats.matchRows
  totals.matchedNotes += stats.matchedNotes
  totals.remaining = stats.remaining
  totals.sessionCostUsd = Number(
    (totals.sessionCostUsd + stats.costUsd).toFixed(6)
  )
}

/**
 * Should we start another batch given spend, remaining work, and wall clock?
 * Pure — unit-tested.
 */
export function shouldStartAnotherBatch(opts: {
  spentUsd: number
  remainingNotes: number
  elapsedMs: number
  wallClockMs: number | null | undefined
  capUsd?: number
}): { ok: true } | { ok: false; reason: BackfillStopReason } {
  if (isSpendAtCap(opts.spentUsd, opts.capUsd)) {
    return { ok: false, reason: 'spend_cap_reached' }
  }
  if (opts.remainingNotes <= 0) {
    return { ok: false, reason: 'done' }
  }
  if (
    opts.wallClockMs != null &&
    opts.wallClockMs > 0 &&
    opts.elapsedMs >= opts.wallClockMs
  ) {
    return { ok: false, reason: 'wall_clock' }
  }
  return { ok: true }
}

/**
 * Run one or more classify/match batches until cap, empty queue, or wall clock.
 */
export async function runBackfillBatches(
  opts: RunBackfillBatchesOpts = {}
): Promise<BackfillBatchTotals> {
  const sinceIso = opts.sinceIso ?? BACKFILL_SINCE_ISO
  const tag = opts.tag ?? BACKFILL_TAG
  const retryFailed = opts.retryFailed === true
  const requestedLimit =
    opts.batchLimit && opts.batchLimit > 0
      ? opts.batchLimit
      : DEFAULT_BACKFILL_BATCH_LIMIT
  const wallClockMs = opts.wallClockMs
  const useClaims = opts.useClaims === true
  const excludeIds = opts.excludeIds
  const now = opts.now ?? Date.now
  const startedAt = now()
  const maxRounds =
    opts.maxRounds ??
    (wallClockMs != null && wallClockMs > 0 ? 40 : 800)

  setCompleteRequestPolicy({
    timeoutMs: opts.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
  })

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return {
      ...emptyTotals(sinceIso, tag, 0),
      done: false,
      stopReason: 'no_db',
    }
  }

  const rates = await loadRecentBackfillRates(db)
  const sample = perNoteCostFromRates(rates)
  let spentUsd = await sumBackfillSpendSince(db, sinceIso)
  const totals = emptyTotals(sinceIso, tag, spentUsd)

  if (isSpendAtCap(spentUsd)) {
    totals.done = true
    totals.stopReason = 'spend_cap_reached'
    return totals
  }

  for (;;) {
    const elapsedMs = now() - startedAt
    // remaining unknown until after a batch; use a positive sentinel for first check
    const gate = shouldStartAnotherBatch({
      spentUsd,
      remainingNotes: totals.rounds === 0 ? 1 : totals.remaining,
      elapsedMs,
      wallClockMs,
    })
    if (!gate.ok) {
      totals.stopReason = gate.reason
      totals.done = gate.reason === 'done' || gate.reason === 'spend_cap_reached'
      totals.cumulativeSpendUsd = Number(spentUsd.toFixed(6))
      break
    }

    const projection = projectBatchAffordable({
      spentUsd,
      batchLimit: requestedLimit,
      perNoteUsd: sample.perNoteUsd,
    })
    if (!projection.ok) {
      totals.stopReason = projection.reason
      totals.done = true
      totals.cumulativeSpendUsd = Number(spentUsd.toFixed(6))
      break
    }

    // Hard stop before any batch that would exceed the cap (projection above).
    totals.rounds += 1

    let stats: ClassifyMatchStats
    if (useClaims) {
      const claimed = await claimBackfillNotes(db, {
        limit: projection.batchLimit,
        retryFailed,
      })
      if (claimed.length === 0) {
        const remaining = await countPendingClassifyMatchNotes({ retryFailed })
        stats = {
          classified: 0,
          classifyFailed: 0,
          matchedNotes: 0,
          matchRows: 0,
          costUsd: 0,
          processed: 0,
          skippedAttempted: 0,
          remaining,
        }
      } else {
        stats = await runClassifyMatchBatch({
          limit: projection.batchLimit,
          onlyPending: true,
          retryFailed,
          claimedNotes: claimed,
          onProgress: opts.onProgress,
          onNoteSettled: async (noteId) => {
            await releaseBackfillClaim(db, noteId)
          },
        })
      }
    } else {
      stats = await runClassifyMatchBatch({
        limit: projection.batchLimit,
        onlyPending: true,
        retryFailed,
        excludeIds,
        onProgress: opts.onProgress,
      })
    }

    mergeStats(totals, stats)
    spentUsd = await sumBackfillSpendSince(db, sinceIso)
    totals.cumulativeSpendUsd = Number(spentUsd.toFixed(6))

    if (isSpendAtCap(spentUsd)) {
      totals.stopReason = 'spend_cap_reached'
      totals.done = true
      break
    }
    if (stats.processed === 0) {
      totals.stopReason = totals.remaining === 0 ? 'done' : 'no_work'
      totals.done = totals.remaining === 0
      break
    }
    if (stats.remaining === 0) {
      totals.stopReason = 'done'
      totals.done = true
      break
    }
    if (totals.rounds >= maxRounds) {
      totals.stopReason = 'wall_clock'
      break
    }
  }

  return totals
}
