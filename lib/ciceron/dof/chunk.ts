export type DofChunk = {
  position: number
  text: string
  canonicalCitationId: string
  sectionLabel: string
}

const MAX_CHARS = 1800
const OVERLAP = 180

type Segment = { label: string; citationSlug: string; text: string }

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function splitBySize(text: string, baseSlug: string, label: string): Segment[] {
  if (text.length <= MAX_CHARS) {
    return [{ label, citationSlug: baseSlug, text }]
  }
  const parts: Segment[] = []
  let start = 0
  let part = 0
  while (start < text.length) {
    let end = Math.min(start + MAX_CHARS, text.length)
    if (end < text.length) {
      const window = text.slice(start, end)
      const breakAt = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('. '))
      if (breakAt > MAX_CHARS * 0.4) end = start + breakAt + (window[breakAt] === '.' ? 1 : 0)
    }
    const slice = text.slice(start, end).trim()
    if (slice) {
      part += 1
      parts.push({
        label,
        citationSlug: part === 1 ? baseSlug : `${baseSlug}-p${part}`,
        text: slice,
      })
    }
    if (end >= text.length) break
    start = Math.max(end - OVERLAP, start + 1)
  }
  return parts
}

/**
 * Structure-first chunking: considerandos, artículos, transitorios, then size.
 * `noteCode` becomes the citation prefix: dof:{code}:{slug}
 */
export function chunkDofText(noteCode: string, text: string, title: string): DofChunk[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const headingRe =
    /^(CONSIDERANDO|ART[IÍ]CULOS?\s+TRANSITORIOS?|TRANSITORIOS?|Art[ií]culo\s+\d+[°º.]*)\b/i

  const lines = normalized.split('\n')
  const segments: Segment[] = []
  let currentLabel = 'preambulo'
  let currentSlug = 'preambulo'
  let buf: string[] = title ? [`Título: ${title}`] : []

  const flush = () => {
    const body = buf.join('\n').trim()
    if (!body) return
    segments.push(...splitBySize(body, currentSlug, currentLabel))
    buf = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const m = line.trim().match(headingRe)
    if (m) {
      flush()
      const head = m[1]
      currentLabel = head
      if (/considerando/i.test(head)) currentSlug = 'considerando'
      else if (/transitor/i.test(head)) currentSlug = 'transitorios'
      else {
        const num = head.match(/\d+/)?.[0] ?? 'x'
        currentSlug = `articulo-${num}`
      }
      buf.push(line.trim())
      continue
    }
    buf.push(line)
  }
  flush()

  // If structure detection failed entirely, size-split the whole note
  if (segments.length === 0) {
    segments.push(...splitBySize(normalized, 'cuerpo', 'cuerpo'))
  }

  const used = new Set<string>()
  return segments.map((s, i) => {
    let slug = slugify(s.citationSlug) || `c${i}`
    if (used.has(slug)) slug = `${slug}-${i}`
    used.add(slug)
    return {
      position: i,
      text: s.text,
      sectionLabel: s.label,
      canonicalCitationId: `dof:${noteCode}:${slug}`,
    }
  })
}

/** Rough token estimate for cost reporting (Spanish ≈ 4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}
