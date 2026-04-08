import type { PulseEmbedPosition } from '@/lib/pulse-embed-constants'

/**
 * Split markdown on `## ` headings (H2). First segment may be preamble without `##`.
 */
export function splitMarkdownByH2(markdown: string): string[] {
  const md = markdown ?? ''
  if (!md.trim()) return ['']
  const parts = md.split(/\n(?=## )/)
  return parts
}

export type PulseMarkdownSplit =
  | { position: 'full_section'; before: string; after: '' }
  | { position: 'after_intro' | 'before_cta'; before: string; after: string }

/**
 * Returns markdown fragments to render before/after the Pulse embed.
 * For `full_section`, `before` is the full article; embed is appended after it.
 */
export function splitMarkdownForPulseEmbed(
  markdown: string,
  position: PulseEmbedPosition
): PulseMarkdownSplit {
  const parts = splitMarkdownByH2(markdown)

  if (position === 'full_section') {
    return { position: 'full_section', before: markdown, after: '' }
  }

  if (position === 'after_intro') {
    // parts[0] = text before first ##; parts[1] = first ## block; parts[2+] = rest
    if (parts.length < 2) {
      return { position: 'after_intro', before: parts[0] ?? '', after: '' }
    }
    const before = [parts[0], parts[1]].filter(Boolean).join('\n')
    const after = parts.length > 2 ? parts.slice(2).join('\n') : ''
    return { position: 'after_intro', before, after }
  }

  // before_cta — inject before the last ## section (assumed CTA)
  if (parts.length <= 1) {
    return { position: 'before_cta', before: parts[0] ?? '', after: '' }
  }
  const last = parts[parts.length - 1] ?? ''
  const beforeLast = parts.slice(0, -1).join('\n')
  return { position: 'before_cta', before: beforeLast, after: last }
}
