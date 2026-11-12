import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { fixtureArchiveChunks } from '@/lib/ciceron/m365/fixtures'
import type { RetrievalHit } from '@/lib/ciceron/research/retrieve'

/**
 * Retrieve from firm archive (OneDrive/SharePoint simulation).
 * Falls back to fixtures when tables/embeddings are missing.
 */
export async function retrieveFirmArchive(opts: {
  question: string
  firmId: string
  limit?: number
}): Promise<RetrievalHit[]> {
  const limit = opts.limit ?? 8
  const tokens = opts.question
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((t) => t.length > 3)
    .slice(0, 8)

  const db = tryCreateCiceronAdminClient()
  if (db) {
    try {
      const { data: items, error } = await db
        .from('firm_archive_items')
        .select('document_id, folder_path, doc_date, parties')
        .eq('firm_id', opts.firmId)
        .eq('is_sample', true)
      if (!error && Array.isArray(items) && items.length > 0) {
        const docIds = (items as Array<{ document_id: string }>).map((i) => i.document_id)
        const meta = new Map(
          (items as Array<{
            document_id: string
            folder_path: string
            doc_date: string | null
            parties: string | null
          }>).map((i) => [i.document_id, i])
        )
        const { data: versions } = await db
          .from('document_versions')
          .select('id, document_id')
          .in('document_id', docIds)
        const versionRows = (Array.isArray(versions) ? versions : []) as Array<{
          id: string
          document_id: string
        }>
        const versionToDoc = new Map(versionRows.map((v) => [v.id, v.document_id]))
        const { data: chunks } = await db
          .from('chunks')
          .select('id, text, version_id, canonical_citation_id')
          .in(
            'version_id',
            versionRows.map((v) => v.id)
          )
        const { data: docs } = await db.from('documents').select('id, title').in('id', docIds)
        const titles = new Map(
          ((Array.isArray(docs) ? docs : []) as Array<{ id: string; title: string | null }>).map(
            (d) => [d.id, d.title]
          )
        )

        const scored: RetrievalHit[] = []
        for (const c of (Array.isArray(chunks) ? chunks : []) as Array<{
          id: string
          text: string
          version_id: string
          canonical_citation_id: string | null
        }>) {
          const docId = versionToDoc.get(c.version_id)
          if (!docId) continue
          const lower = c.text.toLowerCase()
          const score = tokens.reduce((acc, t) => acc + (lower.includes(t) ? 1 : 0), 0.2)
          const m = meta.get(docId)
          scored.push({
            chunkId: c.id,
            text: c.text,
            firmId: opts.firmId,
            canonicalCitationId: c.canonical_citation_id,
            documentId: docId,
            fusedScore: score,
            ftsRank: score,
            vectorDistance: null,
            title: titles.get(docId) ?? null,
            officialUrl: null,
            noteDate: m?.doc_date ?? null,
            authority: m?.folder_path ?? 'Archivo del despacho',
          })
        }
        scored.sort((a, b) => b.fusedScore - a.fusedScore)
        if (scored.length) return scored.slice(0, limit)
      }
    } catch {
      // fall through to fixtures
    }
  }

  return fixtureArchiveChunks
    .map((c) => {
      const lower = c.text.toLowerCase()
      const score = tokens.reduce((acc, t) => acc + (lower.includes(t) ? 1 : 0), 0.3)
      return {
        chunkId: c.chunkId,
        text: c.text,
        firmId: opts.firmId,
        canonicalCitationId: null,
        documentId: c.documentId,
        fusedScore: score,
        ftsRank: score,
        vectorDistance: null,
        title: c.title,
        officialUrl: null,
        noteDate: c.docDate,
        authority: c.folderPath,
      } satisfies RetrievalHit
    })
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .slice(0, limit)
}
