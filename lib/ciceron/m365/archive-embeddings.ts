import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import { CICERON_EMBEDDING_MODEL } from '@/lib/ciceron/db/types'
import { embedTexts } from '@/lib/ciceron/gateway/embeddings'
import { archiveEmbedUpdatePayload } from '@/lib/ciceron/m365/archive-embeddings-policy'

const FIRM_ARCHIVE_SOURCE_KEY = 'firm_archive_sim'
const FIRM_ARCHIVE_CANONICAL_PREFIX = 'firm-archive:'

/**
 * Embed pending non-DOF firm-archive chunks (embedding IS NULL).
 * Sets embedding_model only after a successful gateway embed.
 */
export async function backfillArchiveEmbeddings(limit = 20): Promise<{
  chunks: number
  skipped: boolean
  reason?: string
}> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return { chunks: 0, skipped: true, reason: 'db_unavailable' }
  }

  const { data: sourceRows } = await db
    .from('sources')
    .select('id')
    .eq('source_key', FIRM_ARCHIVE_SOURCE_KEY)
    .limit(1)
  const sourceId =
    Array.isArray(sourceRows) && sourceRows[0]
      ? (sourceRows[0] as { id: string }).id
      : null

  // Prefer source_id match; also pull firm-archive: canonical docs (typed filter chain).
  const bySource = sourceId
    ? await db.from('documents').select('id, canonical_id, source_id').eq('source_id', sourceId).limit(100)
    : { data: [], error: null }
  const byCanonical = await db
    .from('documents')
    .select('id, canonical_id, source_id')
    .limit(200)

  const merged = new Map<string, { id: string; canonical_id: string | null; source_id: string | null }>()
  for (const d of (Array.isArray(bySource.data) ? bySource.data : []) as Array<{
    id: string
    canonical_id: string | null
    source_id: string | null
  }>) {
    merged.set(d.id, d)
  }
  for (const d of (Array.isArray(byCanonical.data) ? byCanonical.data : []) as Array<{
    id: string
    canonical_id: string | null
    source_id: string | null
  }>) {
    if (d.canonical_id?.startsWith(FIRM_ARCHIVE_CANONICAL_PREFIX)) {
      merged.set(d.id, d)
    }
  }

  const docs = [...merged.values()]
  if (!docs.length) {
    return { chunks: 0, skipped: false, reason: 'no_archive_documents' }
  }

  const documentIds = docs.map((d) => d.id)
  const { data: versions } = await db
    .from('document_versions')
    .select('id, document_id')
    .in('document_id', documentIds)
  const versionIds = (Array.isArray(versions) ? versions : []).map(
    (v) => (v as { id: string }).id
  )
  if (!versionIds.length) {
    return { chunks: 0, skipped: false, reason: 'no_versions' }
  }

  const { data: chunks } = await db
    .from('chunks')
    .select('id, text')
    .in('version_id', versionIds)
    .is('embedding', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  const rows = (Array.isArray(chunks) ? chunks : []) as Array<{
    id: string
    text: string
  }>
  if (!rows.length) {
    return { chunks: 0, skipped: false, reason: 'nothing_pending' }
  }

  const embed = await embedTexts(
    rows.map((r) => r.text),
    { purpose: 'firm_archive_embed_backfill' }
  )
  if (!embed.ok) {
    return {
      chunks: 0,
      skipped: true,
      reason: embed.reason,
    }
  }

  let updated = 0
  for (let i = 0; i < rows.length; i++) {
    const payload = archiveEmbedUpdatePayload(true, embed.vectors[i] ?? null)
    if (!payload) continue
    const { error } = await db
      .from('chunks')
      .update({
        embedding: payload.embedding,
        embedding_model: payload.embedding_model,
      })
      .eq('id', rows[i]!.id)
      .is('embedding', null)
    if (!error) updated += 1
  }

  return { chunks: updated, skipped: false }
}

export { archiveEmbedUpdatePayload }
