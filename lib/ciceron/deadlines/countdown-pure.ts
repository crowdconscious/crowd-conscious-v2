/**
 * Business-day countdown + weekly strip helpers for deadline UX.
 */

import {
  parseIsoDate,
  toIsoDate,
} from '@/lib/ciceron/case-files/business-days'
import { todayInMexicoCity } from '@/lib/ciceron/dof/dates'
import { currentWeekWindow } from '@/lib/ciceron/deadlines/week-window-pure'

export type DeadlineUrgencyLevel = 'overdue' | 'today' | 'critical' | 'soon' | 'normal'

export type DeadlineCountdown = {
  businessDaysRemaining: number
  level: DeadlineUrgencyLevel
  /** Marker compatible with existing DeadlineMarker styles where possible. */
  markerUrgency: 'urgent' | 'soon' | 'normal'
}

function isWeekendUtc(d: Date): boolean {
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

/** Count Mon–Fri days from `fromIso` (exclusive) to `toIso` (inclusive). */
export function businessDaysBetween(
  fromIso: string,
  toIso: string,
  nonWorkingIsoDates: Iterable<string> = []
): number {
  const holidays = new Set([...nonWorkingIsoDates].map((d) => d.slice(0, 10)))
  const from = parseIsoDate(fromIso.slice(0, 10))
  const to = parseIsoDate(toIso.slice(0, 10))
  if (to.getTime() <= from.getTime()) return 0
  let cursor = new Date(from.getTime())
  let count = 0
  while (cursor.getTime() < to.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    const iso = toIsoDate(cursor)
    if (isWeekendUtc(cursor)) continue
    if (holidays.has(iso)) continue
    count += 1
  }
  return count
}

export function deadlineCountdown(
  dueAtIso: string,
  todayIso = todayInMexicoCity()
): DeadlineCountdown {
  const dueDay = dueAtIso.slice(0, 10)
  if (dueDay < todayIso) {
    return { businessDaysRemaining: 0, level: 'overdue', markerUrgency: 'urgent' }
  }
  if (dueDay === todayIso) {
    return { businessDaysRemaining: 0, level: 'today', markerUrgency: 'urgent' }
  }
  const remaining = businessDaysBetween(todayIso, dueDay)
  if (remaining <= 2) {
    return { businessDaysRemaining: remaining, level: 'critical', markerUrgency: 'urgent' }
  }
  if (remaining <= 5) {
    return { businessDaysRemaining: remaining, level: 'soon', markerUrgency: 'soon' }
  }
  return { businessDaysRemaining: remaining, level: 'normal', markerUrgency: 'normal' }
}

export type WeekDayCell = {
  iso: string
  weekdayLabel: string
  dayNumber: number
  isToday: boolean
  isWeekend: boolean
  deadlineCount: number
}

/** Monday–Sunday week containing `todayIso` (same window as the metric). */
export function buildWeekStrip(
  deadlineDueIsos: string[],
  todayIso = todayInMexicoCity(),
  weekdayLabels: string[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
): WeekDayCell[] {
  const window = currentWeekWindow(todayIso)
  const monday = parseIsoDate(window.startIso)

  const counts = new Map<string, number>()
  for (const raw of deadlineDueIsos) {
    const iso = raw.slice(0, 10)
    if (iso < window.startIso || iso > window.endIso) continue
    counts.set(iso, (counts.get(iso) ?? 0) + 1)
  }

  const cells: WeekDayCell[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime())
    d.setUTCDate(monday.getUTCDate() + i)
    const iso = toIsoDate(d)
    cells.push({
      iso,
      weekdayLabel: weekdayLabels[i] ?? '',
      dayNumber: d.getUTCDate(),
      isToday: iso === todayIso,
      isWeekend: i >= 5,
      deadlineCount: counts.get(iso) ?? 0,
    })
  }
  return cells
}
