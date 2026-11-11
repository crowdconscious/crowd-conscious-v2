/**
 * Deterministic citation verifier (Prompt 5 / rule 5).
 * No model calls. Pure functions — safe for unit tests.
 */

export type RetrievedChunk = {
  chunkId: string
  text: string
  /** Document firm_id; null = shared official corpus. */
  firmId: string | null
  canonicalCitationId: string | null
  documentId: string | null
}

export type CitedSentence = {
  /** Sentence text as produced by the model (may include trailing citation markers). */
  text: string
  /** Chunk ids the model attached to this sentence. */
  chunkIds: string[]
  /** Optional exact quotes the model claimed from those chunks. */
  quotes?: { chunkId: string; quote: string }[]
}

export type VerifierInput = {
  sentences: CitedSentence[]
  retrieved: RetrievedChunk[]
  /** Firm of the asking user — non-null firm docs from other firms are invisible. */
  userFirmId: string
}

export type VerifiedSentence = {
  text: string
  chunkIds: string[]
  ok: true
}

export type FailedSentence = {
  text: string
  chunkIds: string[]
  ok: false
  reasons: string[]
}

export type VerifierResult = {
  kept: VerifiedSentence[]
  failed: FailedSentence[]
  /** True when retrieval was empty — caller should refuse. */
  nothingRetrieved: boolean
}

function normalizeForQuote(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function isVisible(chunk: RetrievedChunk, userFirmId: string): boolean {
  if (chunk.firmId === null) return true
  return chunk.firmId === userFirmId
}

/**
 * Verify every cited sentence. Fabricated ids, cross-tenant ids, ids outside
 * the retrieved set, and altered quotes all fail. Failed sentences are removed
 * from the answer body by the caller and listed under "No se pudo verificar".
 */
export function verifyCitations(input: VerifierInput): VerifierResult {
  const retrievedMap = new Map(input.retrieved.map((c) => [c.chunkId, c]))
  const nothingRetrieved = input.retrieved.length === 0

  const kept: VerifiedSentence[] = []
  const failed: FailedSentence[] = []

  for (const sentence of input.sentences) {
    const reasons: string[] = []
    const ids = [...new Set(sentence.chunkIds.filter(Boolean))]

    if (ids.length === 0) {
      // Analytical sentences without legal/fact citations are allowed through
      // only when they don't claim quotes.
      if (sentence.quotes?.length) {
        reasons.push('quote_without_chunk_id')
      } else {
        kept.push({ text: sentence.text, chunkIds: [], ok: true })
        continue
      }
    }

    for (const id of ids) {
      const chunk = retrievedMap.get(id)
      if (!chunk) {
        reasons.push(`not_in_retrieved:${id}`)
        continue
      }
      if (!isVisible(chunk, input.userFirmId)) {
        reasons.push(`not_visible_to_firm:${id}`)
      }
    }

    for (const q of sentence.quotes ?? []) {
      const chunk = retrievedMap.get(q.chunkId)
      if (!chunk) {
        reasons.push(`quote_chunk_missing:${q.chunkId}`)
        continue
      }
      if (!isVisible(chunk, input.userFirmId)) {
        reasons.push(`quote_not_visible:${q.chunkId}`)
        continue
      }
      const hay = normalizeForQuote(chunk.text)
      const needle = normalizeForQuote(q.quote)
      if (!needle || !hay.includes(needle)) {
        reasons.push(`altered_quote:${q.chunkId}`)
      }
    }

    if (reasons.length) {
      failed.push({ text: sentence.text, chunkIds: ids, ok: false, reasons })
    } else {
      kept.push({ text: sentence.text, chunkIds: ids, ok: true })
    }
  }

  return { kept, failed, nothingRetrieved }
}

/** Strip markdown citation markers like [chunk:uuid] or (chunk_id). */
export const CITATION_MARKER_RE =
  /\[(?:chunk:)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]|\((?:chunk:)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi

export function parseCitedSentences(answerBody: string): CitedSentence[] {
  const parts = answerBody
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)

  return parts.map((text) => {
    const chunkIds: string[] = []
    let m: RegExpExecArray | null
    const re = new RegExp(CITATION_MARKER_RE.source, 'gi')
    while ((m = re.exec(text)) !== null) {
      const id = m[1] || m[2]
      if (id) chunkIds.push(id.toLowerCase())
    }
    // Quotes in «...» or "..." immediately after a marker are optional; simple capture:
    const quotes: { chunkId: string; quote: string }[] = []
    const quoteRe =
      /\[(?:chunk:)?([0-9a-f-]{36})\]\s*[«"“]([^»"”]+)[»"”]/gi
    let qm: RegExpExecArray | null
    while ((qm = quoteRe.exec(text)) !== null) {
      quotes.push({ chunkId: qm[1]!.toLowerCase(), quote: qm[2]!.trim() })
    }
    return { text, chunkIds, quotes }
  })
}

export function renderVerifiedAnswer(result: VerifierResult): {
  body: string
  unverifiedSection: string | null
} {
  if (result.nothingRetrieved) {
    return {
      body: 'No encontré fundamento en el corpus disponible.',
      unverifiedSection: null,
    }
  }
  const body = result.kept.map((s) => s.text).join(' ').trim()
  if (!result.failed.length) {
    return { body: body || 'No encontré fundamento en el corpus disponible.', unverifiedSection: null }
  }
  const unverifiedSection = [
    'No se pudo verificar',
    ...result.failed.map((f) => `- ${f.text} (${f.reasons.join('; ')})`),
  ].join('\n')
  return {
    body: body || 'No encontré fundamento verificable en el corpus disponible.',
    unverifiedSection,
  }
}
