/**
 * Fixes agent output like `→ Question [https://...]` where the URL is in brackets
 * but not markdown — ReactMarkdown only links `[label](url)`.
 */
export function normalizeBlogMarkdownForDisplay(markdown: string): string {
  let out = markdown
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
