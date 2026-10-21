/**
 * Minimal HTML → plain-text conversion for the text/plain MIME part.
 * Multipart (html + text) mail scores better with spam filters than html-only.
 */
const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&middot;': '·',
  '&rarr;': '→',
}

export function htmlToText(html: string): string {
  let s = html
  s = s.replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
  // Keep link targets: "label (url)"
  s = s.replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
    const text = label.replace(/<[^>]+>/g, '').trim()
    if (!text || text === href) return href
    return `${text} (${href})`
  })
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|table|section)>/gi, '\n')
  s = s.replace(/<li[^>]*>/gi, '- ')
  s = s.replace(/<[^>]+>/g, '')
  s = s.replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)))
  s = s.replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e)
  s = s
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
  s = s.replace(/\n{3,}/g, '\n\n')
  return s.trim()
}
