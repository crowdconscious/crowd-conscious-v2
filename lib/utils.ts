/**
 * Returns a human-readable relative time string in Spanish (e.g. "hace 2h", "hace 3d").
 */
export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (hours >= 24) return `hace ${Math.floor(hours / 24)}d`
  if (hours >= 1) return `hace ${hours}h`
  return `hace ${minutes}m`
}

/**
 * Strips markdown formatting from text for plain previews.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/---/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
}
