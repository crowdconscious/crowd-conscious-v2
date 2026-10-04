/**
 * Multi-select Pulse helpers.
 *
 * Product rule (2026-10-04): every Crowd Conscious Pulse is multi-select
 * (vote_mode='multi', max_selections=3). Create/edit paths force these
 * fields for is_pulse rows; migration 278 adds a BEFORE INSERT DB guard.
 * Non-Pulse markets keep the column default of 'single'.
 */

export const MAX_MULTI_SELECTIONS = 5
export const MIN_MULTI_SELECTIONS = 2
export const DEFAULT_MAX_SELECTIONS = 3

/** Canonical Pulse vote fields — always multi with up to 3 picks. */
export const PULSE_VOTE_MODE = 'multi' as const
export const PULSE_MAX_SELECTIONS = DEFAULT_MAX_SELECTIONS

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Fields to stamp on every is_pulse create/update, ignoring client input.
 * Ranked/single are not allowed for new Pulses.
 */
export function pulseMultiVoteFields(): {
  vote_mode: typeof PULSE_VOTE_MODE
  max_selections: number
} {
  return { vote_mode: PULSE_VOTE_MODE, max_selections: PULSE_MAX_SELECTIONS }
}

/**
 * @deprecated Pulses are always multi (2026-10-04). Kept so old env checks
 * do not break callers; always returns true.
 */
export function isMultiSelectPulsesEnabled(): boolean {
  return true
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
