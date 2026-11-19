/**
 * Pure helpers so demo bulletin boards stay on the current CDMX business day
 * without writing publication_date in the database.
 */

import { isWeekendIso, todayInMexicoCity } from '@/lib/ciceron/dof/dates'

function addCalendarDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y!, m! - 1, d! + days))
  return utc.toISOString().slice(0, 10)
}

/** Current CDMX calendar day rolled back to Mon–Fri when today is a weekend. */
export function currentCdmxBusinessDay(now = new Date()): string {
  let iso = todayInMexicoCity(now)
  while (isWeekendIso(iso)) {
    iso = addCalendarDaysIso(iso, -1)
  }
  return iso
}

/**
 * Choose which stored publication_date to load for a demo firm.
 * Prefer an exact match for `asOf`; otherwise use the latest available date
 * so a stale seed (e.g. 2026-11-18) still powers today's board.
 */
export function pickDemoBulletinPublicationDate(
  asOf: string,
  availableDates: string[]
): string | null {
  const dates = [
    ...new Set(
      availableDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    ),
  ].sort()
  if (dates.length === 0) return null
  if (dates.includes(asOf)) return asOf
  return dates[dates.length - 1]!
}
