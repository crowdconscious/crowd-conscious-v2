/**
 * Display/copy formatting for Investigación answers.
 * Does not change verifier behavior — only transforms already-verified body text
 * for the UI (numbered citations, safe bold/headings, no raw HTML).
 */

import { CITATION_MARKER_RE } from '@/lib/ciceron/research/verifier'

export type AnswerSource = {
  chunkId: string
  authority: string | null
  title: string | null
  noteDate: string | null
  officialUrl: string | null
  passage: string
}

export type CitationIndex = {
  /** lowercase chunkId → 1-based number */
  numberById: Map<string, number>
  /** ordered unique chunk ids (first appearance in body, then leftover sources) */
  orderedIds: string[]
}

const KNOWN_HEADINGS = [
  'conclusión breve',
  'conclusion breve',
  'lo que dicen las fuentes',
  'análisis',
  'analisis',
  'no se pudo verificar',
]

export function buildCitationIndex(
  body: string,
  sources: Array<{ chunkId: string }> = []
): CitationIndex {
  const numberById = new Map<string, number>()
  const orderedIds: string[] = []

  const re = new RegExp(CITATION_MARKER_RE.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(body)) !== null) {
    const id = (m[1] || m[2] || '').toLowerCase()
    if (!id || numberById.has(id)) continue
    numberById.set(id, orderedIds.length + 1)
    orderedIds.push(id)
  }

  for (const s of sources) {
    const id = s.chunkId.toLowerCase()
    if (!id || numberById.has(id)) continue
    numberById.set(id, orderedIds.length + 1)
    orderedIds.push(id)
  }

  return { numberById, orderedIds }
}

export function orderSourcesByCitations<T extends { chunkId: string }>(
  sources: T[],
  index: CitationIndex
): T[] {
  const byId = new Map(sources.map((s) => [s.chunkId.toLowerCase(), s]))
  const ordered: T[] = []
  for (const id of index.orderedIds) {
    const s = byId.get(id)
    if (s) ordered.push(s)
  }
  for (const s of sources) {
    if (!index.numberById.has(s.chunkId.toLowerCase())) ordered.push(s)
  }
  return ordered
}

export type InlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'cite'; n: number; chunkId: string }

export type BlockNode =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; children: InlineNode[] }

function stripOuterBoldHeading(line: string): string | null {
  const trimmed = line.trim()
  const m = trimmed.match(/^\*\*(.+?)\*\*:?\s*$/)
  if (m) return m[1]!.replace(/:$/, '').trim()
  const bare = trimmed.replace(/\*+/g, '').replace(/:$/, '').trim()
  if (KNOWN_HEADINGS.includes(bare.toLowerCase())) return bare
  return null
}

function parseInlines(text: string, index: CitationIndex): InlineNode[] {
  const nodes: InlineNode[] = []
  // Combined tokenizer: citation markers OR **bold**
  const tokenRe = new RegExp(
    `${CITATION_MARKER_RE.source}|(\\*\\*(.+?)\\*\\*)`,
    'gi'
  )
  let last = 0
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push({ kind: 'text', text: text.slice(last, m.index) })
    }
    if (m[1] || m[2]) {
      const id = (m[1] || m[2] || '').toLowerCase()
      const n = index.numberById.get(id)
      if (n) nodes.push({ kind: 'cite', n, chunkId: id })
      // drop unknown markers silently (verifier should have removed them)
    } else if (m[4] !== undefined) {
      nodes.push({ kind: 'bold', text: m[4] })
    }
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push({ kind: 'text', text: text.slice(last) })
  return nodes.filter((n) => n.kind !== 'text' || n.text.length > 0)
}

/** Parse verified answer body into safe display blocks (no HTML). */
export function parseAnswerBlocks(body: string, index: CitationIndex): BlockNode[] {
  const normalized = body.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const paragraphs = normalized.split(/\n{2,}/)
  const blocks: BlockNode[] = []

  for (const para of paragraphs) {
    const lines = para.split('\n').map((l) => l.trimEnd())
    let buffer: string[] = []

    const flushBuffer = () => {
      const text = buffer.join('\n').trim()
      buffer = []
      if (!text) return
      blocks.push({ kind: 'paragraph', children: parseInlines(text, index) })
    }

    for (const line of lines) {
      const heading = stripOuterBoldHeading(line)
      if (heading) {
        flushBuffer()
        blocks.push({ kind: 'heading', text: heading })
        continue
      }
      // Inline-only bold line that looks like a section label ending with :
      const label = line.trim().match(/^\*\*(.+?)\*\*\s*$/)
      if (label && /:$/.test(label[1]!.trim())) {
        flushBuffer()
        blocks.push({ kind: 'heading', text: label[1]!.replace(/:$/, '').trim() })
        continue
      }
      buffer.push(line)
    }
    flushBuffer()
  }

  return blocks
}

/** Plain text for clipboard: numbered citations + numbered source list. */
export function formatAnswerForCopy(
  body: string,
  sources: AnswerSource[],
  index: CitationIndex = buildCitationIndex(body, sources)
): string {
  const re = new RegExp(CITATION_MARKER_RE.source, 'gi')
  let text = body.replace(re, (_full, a: string | undefined, b: string | undefined) => {
    const id = (a || b || '').toLowerCase()
    const n = index.numberById.get(id)
    return n ? `[${n}]` : ''
  })

  // Soften remaining markdown bold markers for paste targets
  text = text.replace(/\*\*(.+?)\*\*/g, '$1')
  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

  const ordered = orderSourcesByCitations(sources, index)
  if (ordered.length === 0) return text

  const lines = ordered.map((s) => {
    const n = index.numberById.get(s.chunkId.toLowerCase())
    const label = [s.authority, s.title, s.noteDate].filter(Boolean).join(' · ')
    const url = s.officialUrl ? ` — ${s.officialUrl}` : ''
    return `[${n}] ${label || s.chunkId}${url}`
  })

  return `${text}\n\nFuentes\n${lines.join('\n')}`
}
