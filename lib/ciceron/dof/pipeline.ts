import 'server-only'

import {
  createCiceronAdminClient,
  tryCreateCiceronAdminClient,
  tryCreateCiceronAdminStorage,
} from '@/lib/ciceron/db/client'
import { CICERON_EMBEDDING_MODEL } from '@/lib/ciceron/db/types'
import { createSidofConnector } from '@/lib/ciceron/connectors/sidof'
import type { SourceListItem } from '@/lib/ciceron/connectors/source'
import { chunkDofText, estimateTokens } from '@/lib/ciceron/dof/chunk'
import { sha256Hex } from '@/lib/ciceron/dof/hash'
import { DOF_BATCH_SIZE, DOF_CONNECTOR_KIND } from '@/lib/ciceron/dof/constants'
import { recordSourceIncidentsForRun } from '@/lib/ciceron/dof/health'
import { embedTexts } from '@/lib/ciceron/gateway/embeddings'

export { DOF_BATCH_SIZE, DOF_CONNECTOR_KIND }

export type PipelineCursor = {
  phase: 'list' | 'process' | 'done'
  /** note codes still to process this run */
  pendingCodes?: string[]
  processed?: number
  listed?: number
  embedded?: number
  embeddingPending?: number
  skipped?: number
  errors?: number
}

export type PipelineResult = {
  runId: string
  targetDate: string
  status: 'succeeded' | 'partial' | 'failed' | 'running'
  cursor: PipelineCursor
  requeue: boolean
  message: string
}

type DofNoteRow = {
  id: string
  note_code: string
  ingest_status: string
  content_hash: string | null
  document_id: string | null
  title: string | null
}

async function startRun(targetDate: string, attempt: number, cursor: PipelineCursor) {
  const db = createCiceronAdminClient()
  const { data, error } = await db
    .from('connector_runs')
    .insert({
      firm_id: null,
      connector_kind: DOF_CONNECTOR_KIND,
      status: 'running',
      target_date: targetDate,
      attempt,
      cursor,
      stats: {},
    })
    .select('id')
    .limit(1)

  if (error || !Array.isArray(data) || !data[0]) {
    throw new Error(error?.message ?? 'failed to insert connector_runs')
  }
  return (data[0] as { id: string }).id
}

async function finishRun(
  runId: string,
  status: PipelineResult['status'],
  cursor: PipelineCursor,
  errorMessage?: string
) {
  const db = createCiceronAdminClient()
  await db
    .from('connector_runs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      cursor,
      stats: cursor,
      error_message: errorMessage ?? null,
    })
    .eq('id', runId)
}

async function upsertListedNotes(items: SourceListItem[]) {
  const db = createCiceronAdminClient()
  for (const item of items) {
    const { data: existing } = await db
      .from('dof_notes')
      .select('id, ingest_status, title')
      .eq('note_code', item.externalId)
      .limit(1)

    if (Array.isArray(existing) && existing[0]) {
      const row = existing[0] as { ingest_status: string; title: string | null }
      // Never downgrade a processed note back to listed
      if (!row.title && item.title) {
        await db
          .from('dof_notes')
          .update({
            title: item.title,
            authority: item.authority,
            section: item.section,
            edition: item.editionKind,
            edition_kind: item.editionKind,
          })
          .eq('note_code', item.externalId)
      }
      continue
    }

    await db.from('dof_notes').insert({
      note_code: item.externalId,
      note_date: item.date,
      edition: item.editionKind,
      edition_kind: item.editionKind,
      section: item.section,
      authority: item.authority,
      title: item.title ?? '',
      ingest_status: 'listed',
    })
  }
}

async function storeRawPayload(noteCode: string, isoDate: string, raw: unknown) {
  const storage = tryCreateCiceronAdminStorage()
  const path = `dof/${isoDate}/${noteCode}.json`
  const body = JSON.stringify(raw)
  if (!storage) {
    // No storage in this environment — still return path for DB bookkeeping
    return { path, stored: false as const, hash: sha256Hex(body) }
  }
  const { error } = await storage.upload(path, body, {
    contentType: 'application/json',
    upsert: true,
  })
  if (error) {
    throw new Error(`storage upload failed: ${error.message}`)
  }
  return { path, stored: true as const, hash: sha256Hex(body) }
}

async function ensureDocumentVersion(opts: {
  noteCode: string
  title: string
  officialUrl: string | null
  contentHash: string
  rawPath: string
  isoDate: string
  documentId: string | null
}) {
  const db = createCiceronAdminClient()
  const canonicalId = `dof:${opts.noteCode}`
  let documentId = opts.documentId

  if (!documentId) {
    const { data: existing } = await db
      .from('documents')
      .select('id')
      .eq('canonical_id', canonicalId)
      .limit(1)
    if (Array.isArray(existing) && existing[0]) {
      documentId = (existing[0] as { id: string }).id
    } else {
      const sourceRes = await db
        .from('sources')
        .select('id')
        .eq('source_key', 'dof_sidof')
        .limit(1)
      const sourceId =
        Array.isArray(sourceRes.data) && sourceRes.data[0]
          ? (sourceRes.data[0] as { id: string }).id
          : null
      const { data: created, error } = await db
        .from('documents')
        .insert({
          canonical_id: canonicalId,
          doc_type: 'dof_note',
          title: opts.title,
          official_url: opts.officialUrl,
          firm_id: null,
          source_id: sourceId,
        })
        .select('id')
        .limit(1)
      if (error || !Array.isArray(created) || !created[0]) {
        throw new Error(error?.message ?? 'document insert failed')
      }
      documentId = (created[0] as { id: string }).id
    }
  }

  // Reuse version when content hash matches
  const { data: versions } = await db
    .from('document_versions')
    .select('id, content_hash')
    .eq('document_id', documentId)
    .eq('content_hash', opts.contentHash)
    .limit(1)

  if (Array.isArray(versions) && versions[0]) {
    return {
      documentId: documentId!,
      versionId: (versions[0] as { id: string }).id,
      reused: true,
    }
  }

  const { data: version, error: vErr } = await db
    .from('document_versions')
    .insert({
      document_id: documentId,
      valid_from: opts.isoDate,
      content_hash: opts.contentHash,
      raw_storage_path: opts.rawPath,
    })
    .select('id')
    .limit(1)

  if (vErr || !Array.isArray(version) || !version[0]) {
    throw new Error(vErr?.message ?? 'document_versions insert failed')
  }

  return {
    documentId: documentId!,
    versionId: (version[0] as { id: string }).id,
    reused: false,
  }
}

async function upsertChunks(
  versionId: string,
  chunks: ReturnType<typeof chunkDofText>,
  embeddings: (number[] | null)[]
) {
  const db = createCiceronAdminClient()
  for (let i = 0; i < chunks.length; i++) {
    const ch = chunks[i]
    const embedding = embeddings[i] ?? null
    await db.from('chunks').upsert(
      {
        version_id: versionId,
        position: ch.position,
        text: ch.text,
        canonical_citation_id: ch.canonicalCitationId,
        embedding,
        embedding_model: embedding ? CICERON_EMBEDDING_MODEL : null,
      },
      { onConflict: 'version_id,position' }
    )
  }
}

async function processOneNote(
  listItem: SourceListItem,
  connector: ReturnType<typeof createSidofConnector>,
  stats: PipelineCursor
) {
  const db = createCiceronAdminClient()
  const { data: existingRows } = await db
    .from('dof_notes')
    .select('id, note_code, ingest_status, content_hash, document_id, title')
    .eq('note_code', listItem.externalId)
    .limit(1)

  const existing = (
    Array.isArray(existingRows) && existingRows[0] ? existingRows[0] : null
  ) as DofNoteRow | null

  if (
    existing &&
    (existing.ingest_status === 'ready' || existing.ingest_status === 'embedding_pending')
  ) {
    stats.skipped = (stats.skipped ?? 0) + 1
    return
  }

  const item = await connector.fetchItem(listItem.externalId, { listHint: listItem })
  if (!item) {
    await db
      .from('dof_notes')
      .update({
        ingest_status: 'skipped',
        last_error: 'empty or missing note body',
        title: listItem.title ?? existing?.title ?? '',
      })
      .eq('note_code', listItem.externalId)
    stats.skipped = (stats.skipped ?? 0) + 1
    return
  }

  const { path, hash } = await storeRawPayload(item.externalId, item.date, item.raw)

  if (existing?.content_hash === hash && existing.document_id) {
    // Same payload already ingested
    await db
      .from('dof_notes')
      .update({
        ingest_status: existing.ingest_status === 'listed' ? 'ready' : existing.ingest_status,
        raw_storage_path: path,
        title: item.title,
        authority: item.authority,
        section: item.section,
      })
      .eq('note_code', item.externalId)
    stats.skipped = (stats.skipped ?? 0) + 1
    return
  }

  const normalised = connector.normalise(item)
  const { documentId, versionId, reused } = await ensureDocumentVersion({
    noteCode: item.externalId,
    title: normalised.title,
    officialUrl: item.officialUrl,
    contentHash: hash,
    rawPath: path,
    isoDate: item.date,
    documentId: existing?.document_id ?? null,
  })

  const chunks = chunkDofText(item.externalId, normalised.text, normalised.title)
  let embeddingPending = false
  let vectors: (number[] | null)[] = chunks.map(() => null)

  if (chunks.length > 0) {
    const embed = await embedTexts(
      chunks.map((c) => c.text),
      { purpose: 'dof_embed_chunks' }
    )
    if (embed.ok) {
      vectors = embed.vectors
      stats.embedded = (stats.embedded ?? 0) + chunks.length
    } else {
      embeddingPending = true
      stats.embeddingPending = (stats.embeddingPending ?? 0) + chunks.length
    }
  }

  if (!reused || chunks.length > 0) {
    await upsertChunks(versionId, chunks, vectors)
  }

  const status = embeddingPending ? 'embedding_pending' : 'ready'
  await db
    .from('dof_notes')
    .update({
      title: normalised.title,
      authority: item.authority,
      section: item.section,
      edition_kind: item.editionKind,
      document_id: documentId,
      content_hash: hash,
      raw_storage_path: path,
      ingest_status: status,
      last_error: null,
      ready_at: status === 'ready' ? new Date().toISOString() : null,
    })
    .eq('note_code', item.externalId)

  stats.processed = (stats.processed ?? 0) + 1
}

/**
 * Idempotent DOF ingest for one calendar day (CDMX). Processes up to
 * DOF_BATCH_SIZE notes then returns requeue=true so the cron can continue.
 */
export async function runDofIngestDay(opts: {
  targetDate: string
  cursor?: PipelineCursor
  attempt?: number
  batchSize?: number
}): Promise<PipelineResult> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return {
      runId: 'none',
      targetDate: opts.targetDate,
      status: 'failed',
      cursor: { phase: 'list' },
      requeue: false,
      message: 'Supabase admin client unavailable',
    }
  }

  const batchSize = opts.batchSize ?? DOF_BATCH_SIZE
  const cursor: PipelineCursor = { ...(opts.cursor ?? { phase: 'list' }) }
  const connector = createSidofConnector()
  const runId = await startRun(opts.targetDate, opts.attempt ?? 1, cursor)

  try {
    if (cursor.phase === 'list' || !cursor.pendingCodes) {
      const items = await connector.listForDate(opts.targetDate)
      cursor.listed = items.length
      await upsertListedNotes(items)

      // Notes that still need work
      const { data: pending } = await db
        .from('dof_notes')
        .select('note_code, ingest_status')
        .eq('note_date', opts.targetDate)
        .in('ingest_status', ['listed', 'fetched', 'normalised', 'chunked', 'failed'])

      const codes = (Array.isArray(pending) ? pending : []).map(
        (r) => (r as { note_code: string }).note_code
      )
      // Also include brand-new listed codes from this list in stable order
      const fromList = items.map((i) => i.externalId)
      const pendingSet = new Set([...codes, ...fromList])
      // Filter to those not already ready/embedding_pending/skipped
      const { data: doneRows } = await db
        .from('dof_notes')
        .select('note_code, ingest_status')
        .eq('note_date', opts.targetDate)
        .in('ingest_status', ['ready', 'embedding_pending', 'skipped'])
      const done = new Set(
        (Array.isArray(doneRows) ? doneRows : []).map(
          (r) => (r as { note_code: string }).note_code
        )
      )
      cursor.pendingCodes = fromList.filter((c) => pendingSet.has(c) && !done.has(c))
      // Re-check statuses for codes only in pending query
      for (const c of codes) {
        if (!done.has(c) && !cursor.pendingCodes.includes(c)) cursor.pendingCodes.push(c)
      }
      cursor.phase = 'process'
    }

    const pending = cursor.pendingCodes ?? []
    const batch = pending.slice(0, batchSize)
    const rest = pending.slice(batchSize)

    // Rebuild list hints for batch
    const listItems = await connector.listForDate(opts.targetDate)
    const byCode = new Map(listItems.map((i) => [i.externalId, i]))

    for (const code of batch) {
      const hint = byCode.get(code) ?? {
        externalId: code,
        title: null,
        date: opts.targetDate,
        editionKind: 'matutina' as const,
        section: null,
        authority: null,
        raw: {},
      }
      try {
        await processOneNote(hint, connector, cursor)
      } catch (err) {
        cursor.errors = (cursor.errors ?? 0) + 1
        await db
          .from('dof_notes')
          .update({
            ingest_status: 'failed',
            last_error: err instanceof Error ? err.message : String(err),
          })
          .eq('note_code', code)
      }
    }

    cursor.pendingCodes = rest
    if (rest.length === 0) {
      cursor.phase = 'done'
      const status =
        (cursor.errors ?? 0) > 0 && (cursor.processed ?? 0) === 0 ? 'failed' : 'succeeded'
      await finishRun(runId, status === 'failed' ? 'failed' : 'succeeded', cursor)
      await recordSourceIncidentsForRun({
        targetDate: opts.targetDate,
        listed: cursor.listed ?? 0,
        status: status === 'failed' ? 'failed' : 'succeeded',
      })
      return {
        runId,
        targetDate: opts.targetDate,
        status: status === 'failed' ? 'failed' : 'succeeded',
        cursor,
        requeue: false,
        message: `DOF ${opts.targetDate} complete (listed=${cursor.listed ?? 0})`,
      }
    }

    await finishRun(runId, 'partial', cursor)
    return {
      runId,
      targetDate: opts.targetDate,
      status: 'partial',
      cursor,
      requeue: true,
      message: `DOF ${opts.targetDate} batch done; ${rest.length} remaining`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await finishRun(runId, 'failed', cursor, message)
    await recordSourceIncidentsForRun({
      targetDate: opts.targetDate,
      listed: cursor.listed ?? 0,
      status: 'failed',
    })
    return {
      runId,
      targetDate: opts.targetDate,
      status: 'failed',
      cursor,
      requeue: false,
      message,
    }
  }
}

/** Back-fill embeddings for notes stuck in embedding_pending. */
export async function backfillPendingEmbeddings(limit = 20): Promise<{
  notes: number
  chunks: number
  skipped: boolean
}> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return { notes: 0, chunks: 0, skipped: true }

  const { data: notes } = await db
    .from('dof_notes')
    .select('id, note_code, document_id')
    .eq('ingest_status', 'embedding_pending')
    .limit(limit)

  if (!Array.isArray(notes) || notes.length === 0) {
    return { notes: 0, chunks: 0, skipped: false }
  }

  let chunkCount = 0
  for (const note of notes as { id: string; note_code: string; document_id: string | null }[]) {
    if (!note.document_id) continue
    const { data: versions } = await db
      .from('document_versions')
      .select('id')
      .eq('document_id', note.document_id)
      .order('created_at', { ascending: false })
      .limit(1)
    const versionId =
      Array.isArray(versions) && versions[0]
        ? (versions[0] as { id: string }).id
        : null
    if (!versionId) continue

    const { data: chunks } = await db
      .from('chunks')
      .select('id, text, position')
      .eq('version_id', versionId)
      .is('embedding', null)
      .order('position', { ascending: true })

    const rows = (Array.isArray(chunks) ? chunks : []) as {
      id: string
      text: string
      position: number
    }[]
    if (!rows.length) {
      await db
        .from('dof_notes')
        .update({ ingest_status: 'ready', ready_at: new Date().toISOString() })
        .eq('id', note.id)
      continue
    }

    const embed = await embedTexts(
      rows.map((r) => r.text),
      { purpose: 'dof_embed_backfill' }
    )
    if (!embed.ok) {
      return { notes: 0, chunks: 0, skipped: embed.reason === 'missing_api_key' }
    }

    for (let i = 0; i < rows.length; i++) {
      await db
        .from('chunks')
        .update({
          embedding: embed.vectors[i],
          embedding_model: CICERON_EMBEDDING_MODEL,
        })
        .eq('id', rows[i].id)
      chunkCount += 1
    }
    await db
      .from('dof_notes')
      .update({ ingest_status: 'ready', ready_at: new Date().toISOString() })
      .eq('id', note.id)
  }

  return { notes: notes.length, chunks: chunkCount, skipped: false }
}

export function estimateDayEmbeddingCostUsd(notesPerDay: number, avgTokensPerNote: number) {
  return (notesPerDay * avgTokensPerNote * 0.02) / 1_000_000
}

export { estimateTokens }
