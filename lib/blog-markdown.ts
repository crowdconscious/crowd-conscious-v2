/**
 * Fixes agent output like `→ Question [https://...]` where the URL is in brackets
 * but not markdown — ReactMarkdown only links `[label](url)`.
 */
export function normalizeBlogMarkdownForDisplay(markdown: string): string {
  let out = markdown

  // Malformed `[label](https://...])` — trailing `]` accidentally inside the URL
  out = out.replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, (_full, label: string, url: string) => {
    let u = url.trimEnd()
    while (u.endsWith(']')) u = u.slice(0, -1).trimEnd()
    return `[${label}](${u})`
  })

  // "text [https://...]" → "[text](https://...)" (skip if already "[text](url)")
  out = out.replace(
    /([^[\]\n]*?)\[(https?:\/\/[^\]\s]+)\](?!\()/g,
    (_, before: string, url: string) => {
      const label = before.trimEnd()
      const linkText = label.length > 0 ? label : url
      return `[${linkText}](${url})`
    }
  )

  return out
}

/**
 * Email clients sometimes receive bad `href` values (e.g. UUID + `]` or `%5D`) when markdown
 * was not normalized before `marked`. Strip a mistaken trailing bracket from http(s) URLs.
 */
export function sanitizeBlogEmailHtmlHrefs(html: string): string {
  return html.replace(/href="([^"]+)"/gi, (_m, href: string) => {
    let h = href.trim()
    if (/^https?:\/\//i.test(h)) {
      if (h.endsWith(']')) h = h.slice(0, -1)
      if (h.endsWith('%5D') || h.endsWith('%5d')) h = h.slice(0, -3)
    }
    return `href="${h}"`
  })
}
