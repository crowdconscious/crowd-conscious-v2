/**
 * Convert SIDOF HTML (`cadenaContenido`) into clean plain text while
 * preserving legal structure markers for structure-first chunking.
 */

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

export function normaliseDofHtml(html: string, titleFallback = ''): { text: string; title: string } {
  let body = html ?? ''

  // Prefer block boundaries before stripping tags
  body = body
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*tr\s*>/gi, '\n')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\s*td[^>]*>/gi, '\t')
    .replace(/<\s*th[^>]*>/gi, '\t')

  // Drop scripts/styles
  body = body.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')

  // Strip remaining tags
  body = body.replace(/<[^>]+>/g, '')
  body = decodeEntities(body)

  // Normalise whitespace but keep paragraph breaks
  const lines = body.split(/\n/).map((l) => l.replace(/[ \t]+/g, ' ').trim())
  const collapsed: string[] = []
  let blank = 0
  for (const line of lines) {
    if (!line) {
      blank += 1
      if (blank <= 1) collapsed.push('')
      continue
    }
    blank = 0
    collapsed.push(line)
  }

  let text = collapsed.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  // Promote common legal headings onto their own lines when glued
  text = text
    .replace(/\b(CONSIDERANDO)\b/gi, '\n\n$1\n')
    .replace(/\b(ART[IÍ]CULOS?\s+TRANSITORIOS?)\b/gi, '\n\n$1\n')
    .replace(/\b(TRANSITORIOS?)\b/gi, '\n\n$1\n')
    .replace(/\b(Art[ií]culo\s+\d+[°º.]*)\b/gi, '\n\n$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const title =
    titleFallback.trim() ||
    text.split('\n').find((l) => l.length > 12)?.slice(0, 240) ||
    'Nota del Diario Oficial'

  return { text, title }
}
