/**
 * Pure helpers for the /stand QR redirect.
 *
 * Stand Pulses are tagged with an event tag (default `semana-accion-stand`)
 * and carry `metadata.stand_day` (YYYY-MM-DD in America/Mexico_City). Selection
 * is data-driven — no hardcoded market IDs or conference dates.
 */

export const DEFAULT_STAND_EVENT_TAG = 'semana-accion-stand'

/** Optional `?event=<slug>` maps to tag `<slug>-stand`. */
const EVENT_SLUG_RE = /^[a-z0-9-]{1,40}$/

export type StandPulseRow = {
  id: string
  published_at: string | null
  created_at: string
  metadata: unknown
}

/** Today's calendar date in America/Mexico_City as YYYY-MM-DD. */
export function cdmxToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(now)
}

export function resolveStandEventTag(eventParam: string | null | undefined): string {
  const slug = typeof eventParam === 'string' ? eventParam.trim().toLowerCase() : ''
  if (!slug || !EVENT_SLUG_RE.test(slug)) return DEFAULT_STAND_EVENT_TAG
  return `${slug}-stand`
}

function readStandDay(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const day = (metadata as { stand_day?: unknown }).stand_day
  return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
}

function publishedMs(row: StandPulseRow): number {
  if (!row.published_at) return 0
  const t = Date.parse(row.published_at)
  return Number.isFinite(t) ? t : 0
}

function createdMs(row: StandPulseRow): number {
  const t = Date.parse(row.created_at)
  return Number.isFinite(t) ? t : 0
}

/** Newest published first; ties broken by created_at desc. */
export function sortStandPulsesByRecency(rows: StandPulseRow[]): StandPulseRow[] {
  return [...rows].sort((a, b) => {
    const pub = publishedMs(b) - publishedMs(a)
    if (pub !== 0) return pub
    return createdMs(b) - createdMs(a)
  })
}

/**
 * Pick today's stand Pulse (by metadata.stand_day === todayCdmx), else the
 * most recently published stand Pulse, else null (caller falls back to results).
 */
export function pickStandPulse(
  rows: StandPulseRow[],
  todayCdmx: string
): StandPulseRow | null {
  if (rows.length === 0) return null

  const todays = rows.filter((r) => readStandDay(r.metadata) === todayCdmx)
  if (todays.length > 0) {
    return sortStandPulsesByRecency(todays)[0] ?? null
  }

  return sortStandPulsesByRecency(rows)[0] ?? null
}

/**
 * Build the redirect target URL, copying all incoming query params except
 * those consumed by the stand router (e.g. `event`).
 */
export function buildStandRedirectUrl(
  origin: string,
  targetPath: string,
  incoming: URLSearchParams,
  consumedKeys: readonly string[] = ['event']
): URL {
  const url = new URL(targetPath, origin)
  for (const [key, value] of incoming.entries()) {
    if (consumedKeys.includes(key)) continue
    url.searchParams.append(key, value)
  }
  return url
}
