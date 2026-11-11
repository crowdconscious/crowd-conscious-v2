import { z } from 'zod'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { complete } from '@/lib/ciceron/gateway/complete'
import { embedTexts } from '@/lib/ciceron/gateway/embeddings'
import {
  PROMPT_RESEARCH_REWRITE_V1,
  wrapUntrusted,
} from '@/lib/ciceron/gateway/prompts'
import type { RetrievedChunk } from '@/lib/ciceron/research/verifier'
import { embeddingsDegradedMessage } from '@/lib/ciceron/research/coverage'

const rewriteSchema = z.object({
  queries: z.array(z.string()).min(1).max(4),
  as_of_date: z.string().nullable().optional(),
})

export type RetrievalHit = RetrievedChunk & {
  fusedScore: number
  ftsRank: number
  vectorDistance: number | null
  title: string | null
  officialUrl: string | null
  noteDate: string | null
  authority: string | null
}

export type RetrievalResult = {
  hits: RetrievalHit[]
  queries: string[]
  degraded: boolean
  degradeReason: string | null
  asOfDate: string | null
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fence ? fence[1]!.trim() : trimmed
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('no JSON object')
  return JSON.parse(raw.slice(start, end + 1))
}

async function resolvePromptVersionId(purpose: string, versionLabel: string) {
  const db = tryCreateCiceronAdminClient()
  if (!db) return null
  const { data } = await db
    .from('prompt_versions')
    .select('id')
    .eq('purpose', purpose)
    .eq('version_label', versionLabel)
    .limit(1)
  return Array.isArray(data) && data[0] ? (data[0] as { id: string }).id : null
}

async function rewriteQueries(question: string, firmId: string, userId: string) {
  const promptVersionId = await resolvePromptVersionId(
    PROMPT_RESEARCH_REWRITE_V1.purpose,
    PROMPT_RESEARCH_REWRITE_V1.versionLabel
  )
  const result = await complete({
    purpose: PROMPT_RESEARCH_REWRITE_V1.purpose,
    tier: 'fast',
    promptVersionId,
    system: PROMPT_RESEARCH_REWRITE_V1.system,
    user: wrapUntrusted('USER_QUESTION', question),
    maxTokens: 400,
    firmId,
    userId,
  })
  if (!result.ok) {
    return { queries: [question], asOfDate: null as string | null }
  }
  try {
    const parsed = rewriteSchema.parse(parseJsonObject(result.text))
    return {
      queries: parsed.queries.map((q) => q.trim()).filter(Boolean).slice(0, 4),
      asOfDate: parsed.as_of_date ?? null,
    }
  } catch {
    return { queries: [question], asOfDate: null as string | null }
  }
}

/**
 * Hybrid retrieval via search_chunks_as_actor. Vector arm fails soft.
 */
export async function retrieveForResearch(opts: {
  question: string
  actorId: string
  firmId: string
  matterId?: string | null
  limit?: number
}): Promise<RetrievalResult> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return {
      hits: [],
      queries: [opts.question],
      degraded: true,
      degradeReason: 'Base de datos no disponible.',
      asOfDate: null,
    }
  }

  const { queries, asOfDate } = await rewriteQueries(
    opts.question,
    opts.firmId,
    opts.actorId
  )

  let queryEmbedding: number[] | null = null
  let degraded = false
  let degradeReason: string | null = null
  const embed = await embedTexts([queries[0] ?? opts.question], {
    purpose: 'research_query_embed',
    firmId: opts.firmId,
    matterId: opts.matterId,
    userId: opts.actorId,
  })
  if (embed.ok) {
    queryEmbedding = embed.vectors[0] ?? null
  } else {
    degraded = true
    degradeReason = embeddingsDegradedMessage()
  }

  const hitMap = new Map<string, RetrievalHit>()
  for (const q of queries) {
    const { data, error } = await db.rpc('search_chunks_as_actor', {
      p_actor: opts.actorId,
      query_text: q,
      query_embedding: queryEmbedding,
      p_firm_id: opts.firmId,
      p_matter_id: opts.matterId ?? null,
      p_limit: opts.limit ?? 12,
    })
    if (error) {
      // Fallback: lexical-only via FTS-less table scan of recent DOF chunks
      const { data: chunks } = await db
        .from('chunks')
        .select('id, text, version_id, canonical_citation_id')
        .limit(40)
      for (const row of (Array.isArray(chunks) ? chunks : []) as {
        id: string
        text: string
        version_id: string
        canonical_citation_id: string | null
      }[]) {
        const needle = q.toLowerCase().slice(0, 40)
        if (!row.text.toLowerCase().includes(needle.split(/\s+/)[0] ?? '')) continue
        if (hitMap.has(row.id)) continue
        hitMap.set(row.id, {
          chunkId: row.id,
          text: row.text,
          firmId: null,
          canonicalCitationId: row.canonical_citation_id,
          documentId: null,
          fusedScore: 0.1,
          ftsRank: 0.1,
          vectorDistance: null,
          title: null,
          officialUrl: null,
          noteDate: null,
          authority: null,
        })
      }
      continue
    }

    for (const row of (Array.isArray(data) ? data : []) as {
      chunk_id: string
      document_id: string
      chunk_text: string
      fused_score: number
      fts_rank: number
      vector_distance: number | null
    }[]) {
      const prev = hitMap.get(row.chunk_id)
      if (prev && prev.fusedScore >= row.fused_score) continue
      hitMap.set(row.chunk_id, {
        chunkId: row.chunk_id,
        text: row.chunk_text,
        firmId: null, // enriched below
        canonicalCitationId: null,
        documentId: row.document_id,
        fusedScore: row.fused_score,
        ftsRank: row.fts_rank,
        vectorDistance: row.vector_distance,
        title: null,
        officialUrl: null,
        noteDate: null,
        authority: null,
      })
    }
  }

  const hits = [...hitMap.values()]
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .slice(0, opts.limit ?? 12)

  // Enrich with document / dof metadata
  for (const hit of hits) {
    if (!hit.documentId) continue
    const { data: docs } = await db
      .from('documents')
      .select('id, title, official_url, firm_id, canonical_id')
      .eq('id', hit.documentId)
      .limit(1)
    const doc = Array.isArray(docs) && docs[0]
      ? (docs[0] as {
          id: string
          title: string | null
          official_url: string | null
          firm_id: string | null
          canonical_id: string
        })
      : null
    if (doc) {
      hit.firmId = doc.firm_id
      hit.title = doc.title
      hit.officialUrl = doc.official_url
      const { data: notes } = await db
        .from('dof_notes')
        .select('note_date, authority, title')
        .eq('document_id', doc.id)
        .limit(1)
      const note = Array.isArray(notes) && notes[0]
        ? (notes[0] as {
            note_date: string
            authority: string | null
            title: string | null
          })
        : null
      if (note) {
        hit.noteDate = note.note_date
        hit.authority = note.authority
        hit.title = hit.title || note.title
        if (asOfDate && note.note_date > asOfDate) {
          // soft filter: keep but lower score
          hit.fusedScore *= 0.5
        }
      }
    }
    const { data: ch } = await db
      .from('chunks')
      .select('canonical_citation_id')
      .eq('id', hit.chunkId)
      .limit(1)
    if (Array.isArray(ch) && ch[0]) {
      hit.canonicalCitationId = (ch[0] as { canonical_citation_id: string | null })
        .canonical_citation_id
    }
  }

  hits.sort((a, b) => b.fusedScore - a.fusedScore)

  return {
    hits,
    queries,
    degraded,
    degradeReason,
    asOfDate,
  }
}
