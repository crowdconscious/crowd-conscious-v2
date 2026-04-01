/**
 * Preview truncation for gated blog posts. Must preserve newlines so markdown
 * (## headings, paragraphs) still parses — joining words with spaces breaks ReactMarkdown.
 */
export function truncateMarkdownPreview(
  content: string,
  maxWords: number
): { preview: string; needsGate: boolean } {
  const trimmed = content.trim()
  if (!trimmed) return { preview: '', needsGate: false }

  const wordRegex = /\S+/g
  let wordCount = 0
  let cutAfterIndex = trimmed.length
  let m: RegExpExecArray | null

  while ((m = wordRegex.exec(trimmed)) !== null) {
    wordCount++
    if (wordCount >= maxWords) {
      cutAfterIndex = m.index + m[0].length
      break
    }
  }

  if (wordCount < maxWords || cutAfterIndex >= trimmed.length) {
    return { preview: trimmed, needsGate: false }
  }

  let truncated = trimmed.slice(0, cutAfterIndex).trimEnd()

  const lastParagraph = truncated.lastIndexOf('\n\n')
  if (lastParagraph > truncated.length * 0.5) {
    truncated = truncated.slice(0, lastParagraph).trimEnd()
  } else {
    const lastSentence = truncated.lastIndexOf('. ')
    if (lastSentence > truncated.length * 0.6) {
      truncated = truncated.slice(0, lastSentence + 1).trimEnd()
    } else {
      truncated = `${truncated}…`
    }
  }

  return { preview: truncated, needsGate: true }
}
