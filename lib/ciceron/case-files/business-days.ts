/**
 * Deadline day-count helpers for Mexican court terms.
 * Business days skip Sat/Sun and dates in non_working_days (jurisdiction MX by default).
 */

export type DayCountKind = 'business' | 'calendar'

/** Parse YYYY-MM-DD as a UTC calendar date (noon UTC to avoid DST edge cases). */
export function parseIsoDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!m) throw new Error(`Invalid date: ${iso}`)
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0))
}

export function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

function addCalendarDays(d: Date, days: number): Date {
  const out = new Date(d.getTime())
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

/**
 * Add `termDays` counting days.
 * - calendar: plain calendar days from the day after `startIso` (exclusive start).
 * - business: skip weekends and `nonWorkingIsoDates` (YYYY-MM-DD set).
 *
 * Convention: day 1 is the first countable day *after* the event date
 * (día hábil / natural siguiente), matching common Mexican procedural practice
 * for demo rules.
 */
export function addTermDays(opts: {
  startIso: string
  termDays: number
  dayCount: DayCountKind
  nonWorkingIsoDates?: Iterable<string>
}): { dueIso: string; countedDates: string[]; skipped: string[] } {
  if (opts.termDays <= 0) throw new Error('termDays must be positive')
  const holidays = new Set(
    [...(opts.nonWorkingIsoDates ?? [])].map((d) => d.slice(0, 10))
  )
  const skipped: string[] = []
  const countedDates: string[] = []
  let cursor = parseIsoDate(opts.startIso)

  const isCountable = (d: Date): boolean => {
    const iso = toIsoDate(d)
    if (opts.dayCount === 'calendar') return true
    if (isWeekend(d)) {
      skipped.push(`${iso} (fin de semana)`)
      return false
    }
    if (holidays.has(iso)) {
      skipped.push(`${iso} (inhábil)`)
      return false
    }
    return true
  }

  while (countedDates.length < opts.termDays) {
    cursor = addCalendarDays(cursor, 1)
    if (isCountable(cursor)) {
      countedDates.push(toIsoDate(cursor))
    }
  }

  return {
    dueIso: countedDates[countedDates.length - 1]!,
    countedDates,
    skipped,
  }
}

export function formatComputationText(opts: {
  eventType: string
  termDays: number
  dayCount: DayCountKind
  legalBasis: string
  startIso: string
  dueIso: string
  skipped: string[]
}): string {
  const kindLabel = opts.dayCount === 'business' ? 'días hábiles' : 'días naturales'
  const skipNote =
    opts.dayCount === 'business' && opts.skipped.length
      ? ` Omitidos: ${opts.skipped.slice(0, 8).join('; ')}${opts.skipped.length > 8 ? '…' : ''}.`
      : ''
  return (
    `Regla: ${opts.eventType} · ${opts.termDays} ${kindLabel}. ` +
    `Base: ${opts.legalBasis} ` +
    `Cómputo desde el día siguiente a ${opts.startIso.slice(0, 10)} → vence ${opts.dueIso}.` +
    skipNote
  )
}
