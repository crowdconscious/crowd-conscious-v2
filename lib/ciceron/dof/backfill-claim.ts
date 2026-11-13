/**
 * Overlap safety for serverless backfill: claim notes with a lease so two
 * concurrent cron invocations cannot double-process the same row.
 *
 * Prefers ciceron.claim_dof_backfill_notes (migration 329). Falls back to a
 * compare-and-swap on backfill_claim_until when the RPC is unavailable but the
 * column exists. Pure helpers below are unit-tested without a database.
 */

export const DEFAULT_CLAIM_LEASE_SECONDS = 600

export type ClaimableNote = {
  id: string
  note_date: string
  classify_status: string
  match_status: string
  backfill_claim_until?: string | null
}

/** Active lease means another worker still owns the note. */
export function hasActiveClaim(
  claimUntil: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!claimUntil) return false
  const t = Date.parse(claimUntil)
  if (!Number.isFinite(t)) return false
  return t > nowMs
}

/** Filter select results to notes that are free to claim. */
export function selectUnclaimedNotes<T extends ClaimableNote>(
  notes: T[],
  nowMs: number = Date.now()
): T[] {
  return notes.filter((n) => !hasActiveClaim(n.backfill_claim_until, nowMs))
}

/**
 * Pure overlap check: given two workers' claim attempts on the same candidate
 * set, only the first successful CAS per id wins.
 */
export function resolveOverlappingClaims(
  attempts: Array<{ workerId: string; noteId: string; won: boolean }>
): Map<string, string> {
  const owner = new Map<string, string>()
  for (const a of attempts) {
    if (!a.won) continue
    if (owner.has(a.noteId)) continue
    owner.set(a.noteId, a.workerId)
  }
  return owner
}

/** Loose admin/schema client (Supabase query builder is not fully typed here). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClaimClient = any

function pendingOrFilter(retryFailed: boolean): string {
  return retryFailed
    ? 'classify_status.in.(pending,failed),match_status.in.(pending,failed)'
    : 'classify_status.eq.pending,match_status.eq.pending'
}

/**
 * Claim up to `limit` pending notes. Returns claimed rows (may be empty).
 * When the RPC is missing, falls back to select + CAS on backfill_claim_until.
 */
export async function claimBackfillNotes(
  db: ClaimClient,
  opts: {
    limit: number
    retryFailed?: boolean
    leaseSeconds?: number
    nowMs?: number
  }
): Promise<ClaimableNote[]> {
  const limit = Math.max(1, Math.min(opts.limit, 50))
  const retryFailed = opts.retryFailed === true
  const leaseSeconds = opts.leaseSeconds ?? DEFAULT_CLAIM_LEASE_SECONDS

  const { data, error } = await db.rpc('claim_dof_backfill_notes', {
    p_limit: limit,
    p_retry_failed: retryFailed,
    p_lease_seconds: leaseSeconds,
  })

  if (!error && Array.isArray(data)) {
    return (data as ClaimableNote[]).map((r) => ({
      id: String(r.id),
      note_date: String(r.note_date),
      classify_status: String(r.classify_status),
      match_status: String(r.match_status),
      backfill_claim_until: r.backfill_claim_until ?? null,
    }))
  }

  // Fallback: select + CAS (needs column from migration 329).
  const nowMs = opts.nowMs ?? Date.now()
  const leaseUntil = new Date(nowMs + leaseSeconds * 1000).toISOString()
  const fetchLimit = Math.min(Math.max(limit * 4, limit), 200)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db
    .from('dof_notes')
    .select(
      'id, note_date, classify_status, match_status, backfill_claim_until'
    )
    .in('ingest_status', ['ready', 'embedding_pending'])
    .or(pendingOrFilter(retryFailed))
    .order('note_date', { ascending: true })
    .limit(fetchLimit)

  const { data: rows, error: selErr } = await query
  if (selErr || !Array.isArray(rows)) {
    console.warn(
      '[ciceron] backfill claim fallback select failed',
      selErr?.message ?? error?.message ?? 'unknown'
    )
    return []
  }

  const candidates = selectUnclaimedNotes(rows as ClaimableNote[], nowMs).slice(
    0,
    limit
  )
  const claimed: ClaimableNote[] = []

  for (const row of candidates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let upd: any = db
      .from('dof_notes')
      .update({ backfill_claim_until: leaseUntil })
      .eq('id', row.id)

    if (row.backfill_claim_until) {
      upd = upd.eq('backfill_claim_until', row.backfill_claim_until)
    } else {
      upd = upd.is('backfill_claim_until', null)
    }

    const { data: updated, error: upErr } = await upd.select('id').maybeSingle()
    if (upErr) {
      console.warn('[ciceron] backfill claim CAS failed', row.id, upErr.message)
      continue
    }
    if (updated) {
      claimed.push({
        ...row,
        backfill_claim_until: leaseUntil,
      })
    }
  }

  return claimed
}

/** Clear lease after a note finishes (success or failure). */
export async function releaseBackfillClaim(
  db: ClaimClient,
  noteId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('dof_notes') as any)
    .update({ backfill_claim_until: null })
    .eq('id', noteId)
  if (error) {
    console.warn('[ciceron] release backfill claim failed', noteId, error.message)
  }
}
