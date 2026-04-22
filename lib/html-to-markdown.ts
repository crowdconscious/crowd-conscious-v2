import TurndownService from 'turndown'

/**
 * HTML → clean markdown for the blog editor.
 *
 * Shared by the paste handler inside `MarkdownEditor`: whenever the user
 * copies formatted text (Google Docs, ChatGPT, web pages, Notion, etc.)
 * the clipboard carries both `text/html` and `text/plain`. We use the
 * HTML variant and convert to markdown so admins don't have to manually
 * annotate headings, bold, links, or lists.
 *
 * Tuned for the conventions in /app/blog rendering:
 *   - ATX headings (`##`) — matches `prose-h2` / `prose-h3` Tailwind rules.
 *   - `**bold**` and `*italic*` — simplest, renders predictably.
 *   - Fenced code blocks — `ReactMarkdown` + `remark-gfm` handle them.
 *   - Blockquotes with `>` — renders with emerald-bordered callout style.
 */
let cached: TurndownService | null = null

function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    hr: '---',
    linkStyle: 'inlined',
  })

  // Remove noise Google Docs / MS Word / Notion insert: <style>, <script>,
  // comments, empty <span>s, and attribute soup. Without this pass the
  // output is littered with `<span style="…">` that Turndown preserves
  // as raw HTML.
  td.remove(['style', 'script', 'meta', 'link', 'title'])

  // Preserve a Google-Docs "highlight" as bold. Docs wraps bold text in
  // `<span style="font-weight:700">` instead of `<strong>`, which Turndown
  // by default emits as literal HTML. Collapse to `**bold**`.
  td.addRule('gdocs-bold-span', {
    filter: (node) => {
      if (node.nodeName !== 'SPAN') return false
      const el = node as HTMLElement
      const fw = el.style?.fontWeight
      if (!fw) return false
      const n = parseInt(fw, 10)
      return !isNaN(n) && n >= 600
    },
    replacement: (content) => (content.trim() ? `**${content}**` : content),
  })

  // Same trick for italic (`font-style: italic`).
  td.addRule('gdocs-italic-span', {
    filter: (node) => {
      if (node.nodeName !== 'SPAN') return false
      const el = node as HTMLElement
      return el.style?.fontStyle === 'italic'
    },
    replacement: (content) => (content.trim() ? `*${content}*` : content),
  })

  // Strip any remaining raw <span>/<div> wrappers so the output is clean
  // markdown text instead of `<span>actual text</span>`.
  td.addRule('strip-inline-wrappers', {
    filter: ['span', 'font' as keyof HTMLElementTagNameMap],
    replacement: (content) => content,
  })

  return td
}

export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  if (!cached) cached = buildTurndown()

  // Pre-clean: Google Docs wraps the entire paste in a `<b id="docs-internal-…">`
  // that forces the whole document bold. Strip those wrapper tags so the
  // inner structure wins.
  const pre = html
    .replace(/<b\s+id="docs-internal-[^"]*"[^>]*>/gi, '')
    .replace(/<\/b>/gi, (match, offset, full) => {
      // Only strip closing </b> if it's the docs-internal wrapper closing —
      // keep other <b> intact. Cheap heuristic: if no <strong> or other
      // matching <b> remains ahead, drop it.
      return /<b[\s>]/i.test(full.slice(offset)) ? match : ''
    })

  let md = cached.turndown(pre)

  // Turndown leaves `&nbsp;` and zero-width chars from Docs — strip them
  // so the markdown body doesn't silently render misaligned spacing.
  md = md
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    // Collapse 3+ blank lines to exactly 2 (one empty line between paragraphs).
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return md
}
