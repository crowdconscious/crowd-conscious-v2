/**
 * Pure helpers for the /condesa QR redirect (Condesa campaign, Oct–Nov 2026).
 *
 * One printed QR per venue (`/condesa?src=qr_<lugar>`) always points at the
 * Pulse that is open right now. Candidates are tagged `condesa-2026`.
 * "Opened" = explicit `metadata.opens_at` (ISO timestamp) when present,
 * else `published_at`. Must be opened at/before now and have a
 * `resolution_date` strictly in the future.
 */

export const CONDESA_TAG = 'condesa-2026'

export type CondesaPulseRow = {
  id: string
  published_at: string | null
  resolution_date: string | null
  created_at: string
  metadata: unknown
}

function parseMs(v: unknown): number | null {
  if (typeof v !== 'string' || !v) return null
  const t = Date.parse(v)
  return Number.isFinite(t) ? t : null
}

/** Explicit open time (metadata.opens_at) if valid, else published_at. */
export function condesaOpenMs(row: CondesaPulseRow): number | null {
  const meta = row.metadata
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const explicit = parseMs((meta as { opens_at?: unknown }).opens_at)
    if (explicit !== null) return explicit
  }
  return parseMs(row.published_at)
}

/** Most recently opened Pulse that is open at `nowMs`, else null. */
export function pickCondesaPulse(
  rows: CondesaPulseRow[],
  nowMs: number = Date.now()
): CondesaPulseRow | null {
  let best: CondesaPulseRow | null = null
  let bestOpen = -Infinity
  for (const row of rows) {
    const open = condesaOpenMs(row)
    const close = parseMs(row.resolution_date)
    if (open === null || open > nowMs) continue
    if (close === null || close <= nowMs) continue
    const better =
      open > bestOpen ||
      (open === bestOpen && best !== null && (parseMs(row.created_at) ?? 0) > (parseMs(best.created_at) ?? 0))
    if (better) {
      best = row
      bestOpen = open
    }
  }
  return best
}
