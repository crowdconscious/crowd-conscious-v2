/**
 * Multi-select Pulse feature flag + selection helpers.
 *
 * Flag default OFF. Owner enables after applying migration 262.
 * Creation UI/API gated by the flag; vote casting for vote_mode=multi
 * still works when the DB row says multi (DB is source of truth).
 */

export const MAX_MULTI_SELECTIONS = 5
export const MIN_MULTI_SELECTIONS = 2
export const DEFAULT_MAX_SELECTIONS = 3

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Server + client: true only when explicitly enabled. */
export function isMultiSelectPulsesEnabled(): boolean {
  if (typeof process === 'undefined') return false
  const server = process.env.MULTI_SELECT_PULSES_ENABLED
  const pub = process.env.NEXT_PUBLIC_MULTI_SELECT_PULSES_ENABLED
  return server === 'true' || pub === 'true'
}

export type VoteSelection = {
  outcome_id: string
  confidence: number
}

/**
 * Parse `selections: [{ outcome_id, confidence }]` from a JSON body.
 * Returns null when absent/empty (legacy single-option path).
 * Returns { ok: false } on malformed input.
 */
export function parseSelections(
  raw: unknown
):
  | { ok: true; selections: VoteSelection[] | null }
  | { ok: false; error: string } {
  if (raw == null) return { ok: true, selections: null }
  if (typeof raw === 'string') {
    try {
      return parseSelections(JSON.parse(raw) as unknown)
    } catch {
      return { ok: false, error: 'Invalid selections JSON' }
    }
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'selections must be an array' }
  }
  if (raw.length === 0) return { ok: true, selections: null }

  const out: VoteSelection[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid selection entry' }
    }
    const rec = item as Record<string, unknown>
    const oid = typeof rec.outcome_id === 'string' ? rec.outcome_id : ''
    const confRaw = rec.confidence
    const confidence =
      typeof confRaw === 'number'
        ? confRaw
        : typeof confRaw === 'string'
          ? parseInt(confRaw, 10)
          : NaN
    if (!UUID_RE.test(oid)) {
      return { ok: false, error: 'Invalid selection outcome_id' }
    }
    if (!Number.isInteger(confidence) || confidence < 0 || confidence > 10) {
      return { ok: false, error: 'Selection confidence must be 0-10' }
    }
    if (seen.has(oid)) {
      return { ok: false, error: 'Duplicate selection outcome' }
    }
    seen.add(oid)
    out.push({ outcome_id: oid, confidence })
  }
  if (out.length > MAX_MULTI_SELECTIONS) {
    return { ok: false, error: `At most ${MAX_MULTI_SELECTIONS} selections` }
  }
  return { ok: true, selections: out }
}

/**
 * Primary pick = highest confidence; tie → first in array (chosen order).
 */
export function primaryFromSelections(selections: VoteSelection[]): VoteSelection {
  if (selections.length === 0) {
    throw new Error('primaryFromSelections: empty')
  }
  let best = selections[0]
  for (let i = 1; i < selections.length; i++) {
    if (selections[i].confidence > best.confidence) {
      best = selections[i]
    }
  }
  return best
}

export function parseMaxSelections(raw: unknown): number {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? parseInt(raw, 10)
        : NaN
  if (!Number.isInteger(n) || n < MIN_MULTI_SELECTIONS || n > MAX_MULTI_SELECTIONS) {
    return DEFAULT_MAX_SELECTIONS
  }
  return n
}
