/**
 * Detect whether the client prefers Markdown over HTML via Accept.
 *
 * Browsers typically send text/html (and often a star/star catch-all). Agents
 * probing for Markdown send `Accept: text/markdown` (sometimes with q-values).
 * We only switch when text/markdown is present and is at least as preferred as
 * text/html. A bare catch-all Accept alone never selects Markdown.
 */
export function prefersMarkdown(acceptHeader: string | null | undefined): boolean {
  if (!acceptHeader) return false

  const parts = acceptHeader.split(',').map((raw) => {
    const [typePart, ...params] = raw.trim().split(';')
    const type = typePart.trim().toLowerCase()
    let q = 1
    for (const param of params) {
      const trimmed = param.trim()
      if (trimmed.startsWith('q=')) {
        const parsed = Number.parseFloat(trimmed.slice(2))
        if (Number.isFinite(parsed)) q = parsed
      }
    }
    return { type, q }
  })

  const markdownQs = parts
    .filter((p) => p.type === 'text/markdown')
    .map((p) => p.q)
  if (markdownQs.length === 0) return false

  const markdownQ = Math.max(...markdownQs)
  if (markdownQ <= 0) return false

  const htmlQs = parts.filter((p) => p.type === 'text/html').map((p) => p.q)
  if (htmlQs.length === 0) return true

  const htmlQ = Math.max(...htmlQs)
  return markdownQ >= htmlQ
}
