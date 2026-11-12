import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { classifyDofNote } from '@/lib/ciceron/dof/classify'
import { matchDofNote } from '@/lib/ciceron/dof/match'

export type ClassifyMatchStats = {
  classified: number
  classifyFailed: number
  matchedNotes: number
  matchRows: number
  costUsd: number
  processed: number
  remaining: number
}

const PENDING_OR =
  'classify_status.in.(pending,failed),match_status.in.(pending,failed)'

async function countPendingNotes(opts?: {
  noteDate?: string
}): Promise<number> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return 0
  let q = db
    .from('dof_notes')
    .select('id', { count: 'exact', head: true })
    .in('ingest_status', ['ready', 'embedding_pending'])
    .or(PENDING_OR)
  if (opts?.noteDate) q = q.eq('note_date', opts.noteDate)
  const { count, error } = await q
  if (error) {
    console.warn('[ciceron] pending note count failed', error.message)
    return 0
  }
  return count ?? 0
}

/**
 * Process ready/embedding_pending notes that still need classify/match.
 * Pending filter is applied in SQL (oldest first). Call again to resume;
 * `remaining` is an exact pending count after the batch.
 */
export async function runClassifyMatchBatch(opts?: {
  limit?: number
  noteDate?: string
  onlyPending?: boolean
}): Promise<ClassifyMatchStats> {
  const db = tryCreateCiceronAdminClient()
  const empty: ClassifyMatchStats = {
    classified: 0,
    classifyFailed: 0,
    matchedNotes: 0,
    matchRows: 0,
    costUsd: 0,
    processed: 0,
    remaining: 0,
  }
  if (!db) return empty

  const limit = opts?.limit ?? 6
  const onlyPending = opts?.onlyPending !== false

  let query = db
    .from('dof_notes')
    .select('id, ingest_status, classify_status, match_status, note_date')
    .in('ingest_status', ['ready', 'embedding_pending'])
    .order('note_date', { ascending: true })
    .limit(limit)

  if (opts?.noteDate) {
    query = query.eq('note_date', opts.noteDate)
  }
  if (onlyPending) {
    // Filter in SQL so we do not stop after the oldest ready (already-done) page.
    query = query.or(PENDING_OR)
  }

  const { data, error } = await query
  if (error) {
    console.warn('[ciceron] classify-match batch select failed', error.message)
    return { ...empty, remaining: await countPendingNotes(opts) }
  }

  const batch = (Array.isArray(data) ? data : []) as {
    id: string
    classify_status: string
    match_status: string
  }[]

  const stats = { ...empty }

  for (const row of batch) {
    stats.processed += 1
    let classifiedOk = row.classify_status === 'classified'

    if (row.classify_status !== 'classified') {
      const c = await classifyDofNote(row.id)
      if (c.ok) {
        stats.classified += 1
        stats.costUsd += c.costUsd ?? 0
        classifiedOk = true
      } else {
        stats.classifyFailed += 1
        continue
      }
    }

    if (
      row.match_status === 'pending' ||
      row.match_status === 'failed' ||
      !classifiedOk ||
      row.classify_status !== 'classified'
    ) {
      const m = await matchDofNote(row.id)
      stats.costUsd += m.costUsd
      if (m.ok) {
        // `matches` is the authoritative DB row count for this note.
        stats.matchRows += m.matches
        if (m.matches > 0) stats.matchedNotes += 1
      }
    }
  }

  stats.remaining = await countPendingNotes(opts)
  return stats
}
