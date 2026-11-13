import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { classifyDofNote } from '@/lib/ciceron/dof/classify'
import { matchDofNote } from '@/lib/ciceron/dof/match'

export type ClassifyMatchStats = {
  classified: number
  classifyFailed: number
  /** Notes that gained at least one new match row this batch. */
  matchedNotes: number
  /** New match rows created this batch (not prior upserts). */
  matchRows: number
  costUsd: number
  processed: number
  skippedAttempted: number
  remaining: number
  /** True when a deadline stopped further notes/model calls mid-batch. */
  stoppedForDeadline: boolean
  /** Claimed note ids that were not started (caller should release leases). */
  unstartedNoteIds: string[]
}

/** Pure: true when wall-clock deadline has been reached. */
export function isPastDeadline(
  nowMs: number,
  deadlineMs: number | null | undefined
): boolean {
  return deadlineMs != null && nowMs >= deadlineMs
}

function pendingFilter(retryFailed: boolean): string {
  if (retryFailed) {
    return 'classify_status.in.(pending,failed),match_status.in.(pending,failed)'
  }
  // Default: do not re-queue notes stuck in failed every round.
  return 'classify_status.eq.pending,match_status.eq.pending'
}

export async function countPendingClassifyMatchNotes(opts?: {
  noteDate?: string
  retryFailed?: boolean
}): Promise<number> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return 0
  let q = db
    .from('dof_notes')
    .select('id', { count: 'exact', head: true })
    .in('ingest_status', ['ready', 'embedding_pending'])
    .or(pendingFilter(opts?.retryFailed === true))
  if (opts?.noteDate) q = q.eq('note_date', opts.noteDate)
  const { count, error } = await q
  if (error) {
    console.warn('[ciceron] pending note count failed', error.message)
    return 0
  }
  return count ?? 0
}

async function countPendingNotes(opts?: {
  noteDate?: string
  retryFailed?: boolean
}): Promise<number> {
  return countPendingClassifyMatchNotes(opts)
}

/**
 * Process ready/embedding_pending notes that still need classify/match.
 * Pending filter is applied in SQL (oldest first). Call again to resume;
 * `remaining` is an exact pending count after the batch.
 *
 * Pass `excludeIds` (mutated) so a live backfill does not retry the same
 * note every round when it stays pending/failed.
 *
 * Pass `claimedNotes` (from claimBackfillNotes) to process a pre-claimed set
 * without re-selecting — required for overlap-safe serverless batches.
 */
export async function runClassifyMatchBatch(opts?: {
  limit?: number
  noteDate?: string
  onlyPending?: boolean
  /** When false (default), failed notes are left for `--retry-failed`. */
  retryFailed?: boolean
  /** Note ids already attempted in this process; skipped and appended to. */
  excludeIds?: Set<string>
  /** Pre-claimed notes (skip select). Mutually preferred over SQL select. */
  claimedNotes?: Array<{
    id: string
    classify_status: string
    match_status: string
  }>
  /** Called after each note finishes (success or failure). */
  onNoteSettled?: (noteId: string) => void | Promise<void>
  /** Heartbeat for backfill stall watchdog (called as each note starts/finishes). */
  onProgress?: (info: { noteId: string; phase: 'start' | 'done' }) => void
  /** Absolute deadline (Date.now ms). No new note/model call starts after this. */
  deadlineMs?: number
  /** Injected clock for tests / deadline checks. */
  now?: () => number
}): Promise<ClassifyMatchStats> {
  const db = tryCreateCiceronAdminClient()
  const empty: ClassifyMatchStats = {
    classified: 0,
    classifyFailed: 0,
    matchedNotes: 0,
    matchRows: 0,
    costUsd: 0,
    processed: 0,
    skippedAttempted: 0,
    remaining: 0,
    stoppedForDeadline: false,
    unstartedNoteIds: [],
  }
  if (!db) return empty

  const limit = opts?.limit ?? 6
  const onlyPending = opts?.onlyPending !== false
  const retryFailed = opts?.retryFailed === true
  const excludeIds = opts?.excludeIds
  const now = opts?.now ?? Date.now
  const deadlineMs = opts?.deadlineMs

  let batch: Array<{
    id: string
    classify_status: string
    match_status: string
  }> = []
  let skippedAttempted = 0

  if (opts?.claimedNotes && opts.claimedNotes.length > 0) {
    batch = opts.claimedNotes.slice(0, limit)
  } else {
    // Over-fetch so we can skip excludeIds and still fill the batch.
    const fetchLimit = Math.min(
      Math.max(limit * 4, limit + (excludeIds?.size ?? 0)),
      200
    )

    let query = db
      .from('dof_notes')
      .select('id, ingest_status, classify_status, match_status, note_date')
      .in('ingest_status', ['ready', 'embedding_pending'])
      .order('note_date', { ascending: true })
      .limit(fetchLimit)

    if (opts?.noteDate) {
      query = query.eq('note_date', opts.noteDate)
    }
    if (onlyPending) {
      query = query.or(pendingFilter(retryFailed))
    }
    if (excludeIds && excludeIds.size > 0 && excludeIds.size <= 80) {
      // PostgREST `not.in` — keep list short; larger sets filtered in JS below.
      const list = Array.from(excludeIds).slice(0, 80).join(',')
      query = query.not('id', 'in', `(${list})`)
    }

    const { data, error } = await query
    if (error) {
      console.warn('[ciceron] classify-match batch select failed', error.message)
      return {
        ...empty,
        remaining: await countPendingNotes({
          noteDate: opts?.noteDate,
          retryFailed,
        }),
      }
    }

    const rows = (Array.isArray(data) ? data : []) as {
      id: string
      classify_status: string
      match_status: string
    }[]

    for (const row of rows) {
      if (excludeIds?.has(row.id)) {
        skippedAttempted += 1
        continue
      }
      batch.push(row)
      if (batch.length >= limit) break
    }
  }

  const stats = { ...empty, skippedAttempted }

  for (let i = 0; i < batch.length; i++) {
    const row = batch[i]!
    if (isPastDeadline(now(), deadlineMs)) {
      stats.stoppedForDeadline = true
      stats.unstartedNoteIds = batch.slice(i).map((r) => r.id)
      break
    }

    excludeIds?.add(row.id)
    stats.processed += 1
    opts?.onProgress?.({ noteId: row.id, phase: 'start' })
    let classifiedOk = row.classify_status === 'classified'

    if (row.classify_status !== 'classified') {
      const c = await classifyDofNote(row.id)
      if (c.ok) {
        stats.classified += 1
        stats.costUsd += c.costUsd ?? 0
        classifiedOk = true
      } else {
        stats.classifyFailed += 1
        opts?.onProgress?.({ noteId: row.id, phase: 'done' })
        await opts?.onNoteSettled?.(row.id)
        continue
      }
    }

    const needsMatch =
      row.match_status === 'pending' ||
      (retryFailed && row.match_status === 'failed') ||
      !classifiedOk ||
      row.classify_status !== 'classified'

    if (needsMatch) {
      if (isPastDeadline(now(), deadlineMs)) {
        // Do not start a new model call after the deadline.
        stats.stoppedForDeadline = true
        opts?.onProgress?.({ noteId: row.id, phase: 'done' })
        await opts?.onNoteSettled?.(row.id)
        stats.unstartedNoteIds = batch.slice(i + 1).map((r) => r.id)
        break
      }
      const m = await matchDofNote(row.id)
      stats.costUsd += m.costUsd
      if (m.ok) {
        stats.matchRows += m.newMatches
        if (m.newMatches > 0) stats.matchedNotes += 1
      }
    }
    opts?.onProgress?.({ noteId: row.id, phase: 'done' })
    await opts?.onNoteSettled?.(row.id)
  }

  stats.remaining = await countPendingNotes({
    noteDate: opts?.noteDate,
    retryFailed,
  })
  return stats
}
