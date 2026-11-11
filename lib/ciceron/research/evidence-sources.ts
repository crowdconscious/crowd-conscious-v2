/**
 * Load Evidencia card metadata for cited chunks.
 * Path: ciceron.chunks → document_versions → documents → dof_notes
 * Uses the service-role ciceron client (demo invite path); firm scoping is
 * enforced by callers that already resolve the persona / firm_id.
 */

import { CITATION_MARKER_RE } from '@/lib/ciceron/research/verifier'
import type { AnswerSource } from '@/lib/ciceron/research/format-answer'

type CiceronDb = NonNullable<
  ReturnType<typeof import('@/lib/ciceron/db/admin').tryCreateCiceronAdminClient>
>

function editionLabel(
  edition: string | null | undefined,
  editionKind: string | null | undefined
): string | null {
  const kind = (editionKind || edition || '').trim()
  if (!kind) return null
  const map: Record<string, string> = {
    matutina: 'Matutina',
    vespertina: 'Vespertina',
    extraordinaria: 'Extraordinaria',
  }
  return map[kind.toLowerCase()] ?? kind
}

function excerpt(text: string, maxChars = 420): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxChars) return cleaned
  const slice = cleaned.slice(0, maxChars)
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('; '), slice.lastIndexOf(' '))
  const cut = lastStop > maxChars * 0.5 ? slice.slice(0, lastStop + 1) : slice
  return `${cut.trim()}…`
}

/** Unique chunk ids in first-appearance order from a verified answer body. */
export function extractCitedChunkIds(body: string): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  const re = new RegExp(CITATION_MARKER_RE.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    const id = (m[1] || m[2] || '').toLowerCase()
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/**
 * Resolve chunk ids to rich DOF evidence sources, preserving input order.
 * Missing / unreadable chunks are skipped (never invent metadata).
 */
export async function loadEvidenceSources(
  db: CiceronDb,
  chunkIds: string[],
  opts?: { firmId?: string | null }
): Promise<AnswerSource[]> {
  const unique = [...new Set(chunkIds.map((id) => id.toLowerCase()).filter(Boolean))]
  if (unique.length === 0) return []

  const { data: chunkRows, error: chunkErr } = await db
    .from('chunks')
    .select('id, text, version_id, canonical_citation_id')
    .in('id', unique)

  if (chunkErr || !Array.isArray(chunkRows)) return []

  type ChunkRow = {
    id: string
    text: string
    version_id: string
    canonical_citation_id: string | null
  }
  const chunks = chunkRows as ChunkRow[]
  const byChunkId = new Map(chunks.map((c) => [c.id.toLowerCase(), c]))

  const versionIds = [...new Set(chunks.map((c) => c.version_id).filter(Boolean))]
  const versionToDoc = new Map<string, string>()
  if (versionIds.length) {
    const { data: versions } = await db
      .from('document_versions')
      .select('id, document_id')
      .in('id', versionIds)
    for (const v of (Array.isArray(versions) ? versions : []) as Array<{
      id: string
      document_id: string
    }>) {
      versionToDoc.set(v.id, v.document_id)
    }
  }

  const documentIds = [...new Set([...versionToDoc.values()])]
  type DocRow = {
    id: string
    title: string | null
    official_url: string | null
    firm_id: string | null
  }
  const docs = new Map<string, DocRow>()
  if (documentIds.length) {
    const { data: docRows } = await db
      .from('documents')
      .select('id, title, official_url, firm_id')
      .in('id', documentIds)
    for (const d of (Array.isArray(docRows) ? docRows : []) as DocRow[]) {
      // Shared corpus (firm_id null) or caller's firm only
      if (
        opts?.firmId &&
        d.firm_id !== null &&
        d.firm_id !== opts.firmId
      ) {
        continue
      }
      docs.set(d.id, d)
    }
  }

  type NoteRow = {
    document_id: string | null
    note_code: string
    note_date: string
    edition: string | null
    edition_kind: string | null
    section: string | null
    authority: string | null
    title: string | null
  }
  const notesByDoc = new Map<string, NoteRow>()
  if (documentIds.length) {
    const { data: notes } = await db
      .from('dof_notes')
      .select(
        'document_id, note_code, note_date, edition, edition_kind, section, authority, title'
      )
      .in('document_id', documentIds)
    for (const n of (Array.isArray(notes) ? notes : []) as NoteRow[]) {
      if (n.document_id) notesByDoc.set(n.document_id, n)
    }
  }

  const out: AnswerSource[] = []
  for (const id of unique) {
    const chunk = byChunkId.get(id)
    if (!chunk) continue
    const documentId = versionToDoc.get(chunk.version_id)
    const doc = documentId ? docs.get(documentId) : undefined
    if (documentId && !doc) continue // firm-scoped doc filtered out
    const note = documentId ? notesByDoc.get(documentId) : undefined

    const title = note?.title || doc?.title || null
    const authority = note?.authority || null
    const noteDate = note?.note_date || null
    const section = note?.section || null
    const edition = editionLabel(note?.edition, note?.edition_kind)
    const officialUrl = doc?.official_url || null
    const noteCode = note?.note_code || null

    out.push({
      chunkId: chunk.id,
      title,
      authority,
      noteDate,
      officialUrl,
      passage: excerpt(chunk.text),
      section,
      edition,
      noteCode,
    })
  }
  return out
}
