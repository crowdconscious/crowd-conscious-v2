import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  countDeadlinesInCurrentWeek,
  currentWeekWindow,
  isDueInWeekWindow,
} from './week-window-pure'

describe('currentWeekWindow', () => {
  it('returns Mon–Sun for a Thursday in CDMX', () => {
    // 2026-11-19 is Thursday
    const w = currentWeekWindow('2026-11-19')
    assert.equal(w.startIso, '2026-11-16')
    assert.equal(w.endIso, '2026-11-22')
    assert.equal(w.todayIso, '2026-11-19')
  })
})

describe('countDeadlinesInCurrentWeek', () => {
  it('matches the week strip window (not urgency)', () => {
    const today = '2026-11-19'
    const n = countDeadlinesInCurrentWeek(
      [
        '2026-11-20T23:59:00-06:00', // Fri this week
        '2026-11-24T23:59:00-06:00', // next week
        null,
      ],
      today
    )
    assert.equal(n, 1)
    assert.equal(
      isDueInWeekWindow('2026-11-20', currentWeekWindow(today)),
      true
    )
    assert.equal(
      isDueInWeekWindow('2026-11-24', currentWeekWindow(today)),
      false
    )
  })
})
