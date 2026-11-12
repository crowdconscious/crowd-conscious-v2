import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { addTermDays, toIsoDate, parseIsoDate } from '@/lib/ciceron/case-files/business-days'

describe('addTermDays business', () => {
  it('skips weekends when counting business days', () => {
    // Friday 2026-11-06 → next business days start Mon 09
    const r = addTermDays({
      startIso: '2026-11-06',
      termDays: 3,
      dayCount: 'business',
      nonWorkingIsoDates: [],
    })
    assert.equal(r.dueIso, '2026-11-11')
    assert.deepEqual(r.countedDates, ['2026-11-09', '2026-11-10', '2026-11-11'])
    assert.ok(r.skipped.some((s) => s.includes('2026-11-07')))
    assert.ok(r.skipped.some((s) => s.includes('2026-11-08')))
  })

  it('skips listed non-working days', () => {
    // Mon 2026-11-16 is Revolución Mexicana in seed calendar
    const r = addTermDays({
      startIso: '2026-11-13', // Friday
      termDays: 3,
      dayCount: 'business',
      nonWorkingIsoDates: ['2026-11-16'],
    })
    // Sat 14, Sun 15 skipped; Mon 16 holiday; Tue 17, Wed 18, Thu 19 counted
    assert.equal(r.dueIso, '2026-11-19')
    assert.deepEqual(r.countedDates, ['2026-11-17', '2026-11-18', '2026-11-19'])
    assert.ok(r.skipped.some((s) => s.includes('2026-11-16')))
  })

  it('calendar days ignore weekends and holidays', () => {
    const r = addTermDays({
      startIso: '2026-11-13',
      termDays: 3,
      dayCount: 'calendar',
      nonWorkingIsoDates: ['2026-11-16'],
    })
    assert.equal(r.dueIso, '2026-11-16')
    assert.deepEqual(r.countedDates, ['2026-11-14', '2026-11-15', '2026-11-16'])
    assert.equal(r.skipped.length, 0)
  })
})

describe('date helpers', () => {
  it('round-trips ISO dates', () => {
    assert.equal(toIsoDate(parseIsoDate('2026-05-01')), '2026-05-01')
  })
})
