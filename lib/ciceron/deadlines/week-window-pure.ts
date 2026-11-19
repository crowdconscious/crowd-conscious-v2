/**
 * Shared CDMX calendar-week window for Su mañana metrics + week strip.
 * Week = Monday–Sunday containing today (America/Mexico_City date).
 */

import { parseIsoDate, toIsoDate } from '@/lib/ciceron/case-files/business-days'
import { todayInMexicoCity } from '@/lib/ciceron/dof/dates'

export type WeekWindow = {
  startIso: string
  endIso: string
  todayIso: string
}

/** Monday–Sunday week containing `todayIso` (CDMX calendar date). */
export function currentWeekWindow(todayIso = todayInMexicoCity()): WeekWindow {
  const today = parseIsoDate(todayIso)
  const dow = today.getUTCDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today.getTime())
  monday.setUTCDate(monday.getUTCDate() + mondayOffset)
  const sunday = new Date(monday.getTime())
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return {
    startIso: toIsoDate(monday),
    endIso: toIsoDate(sunday),
    todayIso,
  }
}

export function isDueInWeekWindow(dueAtIso: string, window: WeekWindow): boolean {
  const day = dueAtIso.slice(0, 10)
  return day >= window.startIso && day <= window.endIso
}

/** Count deadlines whose due date falls in the current CDMX week. */
export function countDeadlinesInCurrentWeek(
  dueAts: Array<string | null | undefined>,
  todayIso = todayInMexicoCity()
): number {
  const window = currentWeekWindow(todayIso)
  let n = 0
  for (const raw of dueAts) {
    if (!raw) continue
    if (isDueInWeekWindow(raw, window)) n += 1
  }
  return n
}
