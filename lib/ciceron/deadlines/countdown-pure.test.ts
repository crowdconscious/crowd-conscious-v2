import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildWeekStrip,
  businessDaysBetween,
  deadlineCountdown,
} from './countdown-pure'

describe('businessDaysBetween', () => {
  it('counts weekdays exclusive of start inclusive of end', () => {
    // Mon 2026-11-16 → Wed 2026-11-18 = 2 business days
    assert.equal(businessDaysBetween('2026-11-16', '2026-11-18'), 2)
  })

  it('skips weekends', () => {
    // Fri 2026-11-13 → Mon 2026-11-16 = 1 (Mon)
    assert.equal(businessDaysBetween('2026-11-13', '2026-11-16'), 1)
  })
})

describe('deadlineCountdown', () => {
  it('escalates level by remaining business days', () => {
    assert.equal(deadlineCountdown('2026-11-10', '2026-11-19').level, 'overdue')
    assert.equal(deadlineCountdown('2026-11-19', '2026-11-19').level, 'today')
    assert.equal(deadlineCountdown('2026-11-20', '2026-11-19').level, 'critical')
    assert.equal(deadlineCountdown('2026-11-26', '2026-11-19').level, 'soon')
    assert.equal(deadlineCountdown('2026-12-10', '2026-11-19').level, 'normal')
  })
})

describe('buildWeekStrip', () => {
  it('builds a Monday-start week with today marked', () => {
    // 2026-11-19 is Thursday
    const week = buildWeekStrip(['2026-11-19', '2026-11-20'], '2026-11-19')
    assert.equal(week.length, 7)
    assert.equal(week[0]?.iso, '2026-11-16')
    assert.equal(week[3]?.isToday, true)
    assert.equal(week[3]?.deadlineCount, 1)
    assert.equal(week[4]?.deadlineCount, 1)
  })
})
