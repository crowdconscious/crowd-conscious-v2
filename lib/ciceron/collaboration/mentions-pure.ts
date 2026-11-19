/**
 * Parse @mentions against firm members. Mentions match display names
 * case-insensitively; longest name wins when overlapping.
 */

export type MentionMember = { id: string; displayName: string }

export function extractMentionIds(
  body: string,
  members: readonly MentionMember[]
): string[] {
  if (!body || members.length === 0) return []
  const sorted = [...members].sort(
    (a, b) => b.displayName.length - a.displayName.length
  )
  const found = new Set<string>()
  const consumed = new Array<boolean>(body.length).fill(false)
  const lower = body.toLowerCase()

  for (const m of sorted) {
    const token = `@${m.displayName}`.toLowerCase()
    let from = 0
    while (from < lower.length) {
      const idx = lower.indexOf(token, from)
      if (idx < 0) break
      const end = idx + token.length
      const overlap = consumed.slice(idx, end).some(Boolean)
      const beforeOk = idx === 0 || /\s|[([{"']/.test(body[idx - 1] ?? ' ')
      const afterOk =
        end >= body.length || /[\s,.;:!?)\]}'"]/.test(body[end] ?? ' ')
      if (!overlap && beforeOk && afterOk) {
        found.add(m.id)
        for (let i = idx; i < end; i++) consumed[i] = true
      }
      from = idx + 1
    }
  }
  return [...found]
}

export function filterMentionCandidates(
  query: string,
  members: readonly MentionMember[],
  limit = 6
): MentionMember[] {
  const q = query.trim().toLowerCase()
  const list = q
    ? members.filter((m) => m.displayName.toLowerCase().includes(q))
    : [...members]
  return list.slice(0, limit)
}
