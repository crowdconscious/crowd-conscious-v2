/**
 * Ranked Pulse votes (F2) + Other free-text (F3).
 *
 * Storage choice: `market_votes.rankings` jsonb `[{outcome_id, rank}]` rather
 * than a child table. Rankings are at most 3 rows, uniqueness already lives
 * on the vote row, and the vote RPCs stay a single INSERT/UPDATE. Preference
 * (rank 2/3) is aggregated in TS from the same vote rows the Pulse page
 * already loads. Revisit a child table if we need SQL-native rank queries.
 *
 * Scoring A1: `market_votes.outcome_id` + confidence are rank-1 only.
 * Ranks 2–3 are preference signal, not extra confidence weight.
 */

export const OTHER_TEXT_MAX = 120
export const MAX_RANKED_CHOICES = 3
export const LISTED_OUTCOMES_MAX = 6

export const OTHER_OUTCOME_LABEL_ES = 'Otro'
export const OTHER_OUTCOME_LABEL_EN = 'Other'

export type VoteMode = 'single' | 'ranked' | 'multi'

export type RankingEntry = {
  outcome_id: string
  rank: number
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseVoteMode(raw: unknown): VoteMode {
  if (raw === 'ranked') return 'ranked'
  if (raw === 'multi') return 'multi'
  return 'single'
}

export function parseAllowOther(raw: unknown): boolean {
  return raw === true || raw === 'true' || raw === 1
}

export function parseRankings(raw: unknown): RankingEntry[] | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return parseRankings(JSON.parse(raw) as unknown)
    } catch {
      return null
    }
  }
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: RankingEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const rec = item as Record<string, unknown>
    const oid = typeof rec.outcome_id === 'string' ? rec.outcome_id : ''
    const rankRaw = rec.rank
    const rank =
      typeof rankRaw === 'number'
        ? rankRaw
        : typeof rankRaw === 'string'
          ? parseInt(rankRaw, 10)
          : NaN
    if (!UUID_RE.test(oid) || !Number.isInteger(rank) || rank < 1 || rank > MAX_RANKED_CHOICES) {
      return null
    }
    out.push({ outcome_id: oid, rank })
  }
  return out.sort((a, b) => a.rank - b.rank)
}

export function rankingsToOrderedIds(rankings: RankingEntry[] | null | undefined): string[] {
  if (!rankings || rankings.length === 0) return []
  return [...rankings].sort((a, b) => a.rank - b.rank).map((r) => r.outcome_id)
}

export function orderedIdsToRankings(ids: string[]): RankingEntry[] {
  return ids.slice(0, MAX_RANKED_CHOICES).map((outcome_id, i) => ({
    outcome_id,
    rank: i + 1,
  }))
}

export function normalizeOtherText(raw: unknown): { ok: true; text: string | null } | { ok: false; error: string } {
  if (raw == null) return { ok: true, text: null }
  if (typeof raw !== 'string') return { ok: false, error: 'Other text must be a string' }
  const text = raw.trim()
  if (!text) return { ok: true, text: null }
  if (text.length > OTHER_TEXT_MAX) {
    return { ok: false, error: `Other text must be ${OTHER_TEXT_MAX} characters or fewer` }
  }
  return { ok: true, text }
}

export type OtherTextGroup = {
  text: string
  count: number
}

/** Group identical trimmed strings. Empty/whitespace-only values are dropped. */
export function groupOtherTexts(texts: Array<string | null | undefined>): OtherTextGroup[] {
  const map = new Map<string, number>()
  for (const raw of texts) {
    if (typeof raw !== 'string') continue
    const text = raw.trim()
    if (!text) continue
    map.set(text, (map.get(text) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
}

export function otherOutcomeInsertRow(marketId: string, sortOrder: number): {
  market_id: string
  label: string
  translations: { en: { label: string } }
  is_other: boolean
  sort_order: number
  probability: number
  vote_count: number
  total_confidence: number
} {
  return {
    market_id: marketId,
    label: OTHER_OUTCOME_LABEL_ES,
    translations: { en: { label: OTHER_OUTCOME_LABEL_EN } },
    is_other: true,
    sort_order: sortOrder,
    probability: 0,
    vote_count: 0,
    total_confidence: 0,
  }
}
