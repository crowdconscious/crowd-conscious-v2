/**
 * Display-only Divergence Index formatter.
 * Does not change stored values, computeDivergence, the API, or the DB.
 */

const EM_DASH = '—'

/**
 * Round a Divergence Index (or sub-score) for UI / share / OG text.
 * Null, undefined, and NaN → em dash (never coerce missing to 0).
 */
export function formatDivergence(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH
  return String(Math.round(value))
}

/**
 * Numeric round for count-up state. Null/NaN stay null so readouts
 * can show the em dash + "Sin índice" hint instead of 0.
 */
export function roundDivergence(
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return Math.round(value)
}
