/**
 * Pure helpers mirroring ciceron.refresh_demo_dates deadline placement.
 * Sample deadlines land at ~2, 6, and 14 business days from today (none overdue).
 */

import { addTermDays } from '@/lib/ciceron/case-files/business-days'

/** Business-day offsets applied round-robin to sample deadlines after freshness. */
export const DEMO_DEADLINE_BUSINESS_OFFSETS = [2, 6, 14] as const

/**
 * Returns due ISO dates (YYYY-MM-DD) for `deadlineCount` sample deadlines,
 * cycling through DEMO_DEADLINE_BUSINESS_OFFSETS from `todayIso`.
 * Day count matches addTermDays (day 1 = first business day after today).
 */
export function demoDeadlineDueIsos(opts: {
  todayIso: string
  deadlineCount: number
  nonWorkingIsoDates?: Iterable<string>
}): string[] {
  const out: string[] = []
  const holidays = opts.nonWorkingIsoDates
  for (let i = 0; i < opts.deadlineCount; i++) {
    const termDays =
      DEMO_DEADLINE_BUSINESS_OFFSETS[i % DEMO_DEADLINE_BUSINESS_OFFSETS.length]!
    const { dueIso } = addTermDays({
      startIso: opts.todayIso,
      termDays,
      dayCount: 'business',
      nonWorkingIsoDates: holidays,
    })
    out.push(dueIso)
  }
  return out
}

/** True when every due date is strictly after todayIso (none overdue / same-day). */
export function demoDeadlinesNoneOverdue(
  dueIsos: string[],
  todayIso: string
): boolean {
  return dueIsos.every((d) => d > todayIso)
}
