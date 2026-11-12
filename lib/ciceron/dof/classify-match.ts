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

/**
 * Process ready/embedding_pending notes that still need classify/match.
 * Batched for cron; resume by calling again.
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
  let query = db
    .from('dof_notes')
    .select('id, ingest_status, classify_status, match_status, note_date')
    .in('ingest_status', ['ready', 'embedding_pending'])
    // Oldest → newest so backfills fill the corpus chronologically for demos
    .order('note_date', { ascending: true })
    .limit(200)

  if (opts?.noteDate) {
    query = query.eq('note_date', opts.noteDate)
  }

  const { data } = await query
  const rows = (Array.isArray(data) ? data : []) as {
    id: string
    classify_status: string
    match_status: string
  }[]

  const pending = rows.filter((r) => {
    if (!opts?.onlyPending) {
      return r.classify_status !== 'classified' || r.match_status === 'pending'
    }
    return (
      r.classify_status === 'pending' ||
      r.classify_status === 'failed' ||
      r.match_status === 'pending' ||
      r.match_status === 'failed'
    )
  })

  const batch = pending.slice(0, limit)
  const stats = { ...empty, remaining: Math.max(0, pending.length - batch.length) }

  for (const row of batch) {
    stats.processed += 1
    if (row.classify_status !== 'classified') {
      const c = await classifyDofNote(row.id)
      if (c.ok) {
        stats.classified += 1
        stats.costUsd += c.costUsd ?? 0
      } else {
        stats.classifyFailed += 1
        continue
      }
    }

    if (row.match_status === 'pending' || row.match_status === 'failed' || row.classify_status !== 'classified') {
      const m = await matchDofNote(row.id)
      stats.costUsd += m.costUsd
      if (m.ok && m.matches > 0) {
        stats.matchedNotes += 1
        stats.matchRows += m.matches
      }
    }
  }

  return stats
}
