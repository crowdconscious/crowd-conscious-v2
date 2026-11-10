export type WatchProfileScoreInput = {
  id: string
  client_id: string
  subject_areas: string[]
  authorities: string[]
  keywords: string[]
  norms_of_interest: string[]
  description: string | null
  embedding: number[] | null
}

export type NoteScoreInput = {
  id: string
  title: string
  authority: string | null
  labels: string[]
  summary: string | null
  document_type: string | null
  chunks: { id: string; text: string; embedding: number[] | null }[]
}

export type Candidate = {
  profile: WatchProfileScoreInput
  score: number
  vectorUsed: boolean
  why: string
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function overlapScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const bs = new Set(b.map(normalize))
  let hits = 0
  for (const x of a) if (bs.has(normalize(x))) hits += 1
  return hits / Math.max(a.length, 1)
}

function keywordHits(keywords: string[], haystack: string): number {
  const h = normalize(haystack)
  let hits = 0
  for (const k of keywords) {
    const nk = normalize(k)
    if (nk.length >= 3 && h.includes(nk)) hits += 1
  }
  return hits
}

/**
 * Vector similarity is fail-soft while embeddings are pending:
 * if either side lacks a vector, return null and rely on lexical/taxonomy/authority.
 */
function cosineSimilarity(a: number[] | null, b: number[] | null): number | null {
  if (!a?.length || !b?.length || a.length !== b.length) return null
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    na += a[i]! * a[i]!
    nb += b[i]! * b[i]!
  }
  if (na === 0 || nb === 0) return null
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

export function scoreCandidates(
  note: NoteScoreInput,
  profiles: WatchProfileScoreInput[]
): Candidate[] {
  const haystack = [
    note.title,
    note.summary ?? '',
    note.authority ?? '',
    ...note.chunks.map((c) => c.text),
  ]
    .join('\n')
    .slice(0, 100_000)

  const noteVec =
    note.chunks.map((c) => c.embedding).find((e) => Array.isArray(e) && e.length > 0) ??
    null

  const out: Candidate[] = []
  for (const profile of profiles) {
    const area = overlapScore(note.labels, profile.subject_areas)
    const auth = overlapScore(
      [note.authority ?? ''].filter(Boolean),
      profile.authorities
    )
    const kw = keywordHits(profile.keywords, haystack)
    const norms = keywordHits(profile.norms_of_interest, haystack)
    const lexical = Math.min(1, kw * 0.12 + norms * 0.15)

    const vec = cosineSimilarity(noteVec, profile.embedding)
    const vectorUsed = vec !== null
    const vectorPart = vec !== null ? Math.max(0, vec) * 0.35 : 0

    const score = Math.min(
      1,
      area * 0.35 + auth * 0.25 + lexical * 0.4 + vectorPart
    )

    if (score < 0.12 && kw === 0 && area === 0 && auth === 0) continue

    out.push({
      profile,
      score,
      vectorUsed,
      why: vectorUsed
        ? 'lexical+taxonomy+vector'
        : 'lexical+taxonomy+authority (vector skipped: embeddings pending)',
    })
  }

  return out.sort((a, b) => b.score - a.score)
}
