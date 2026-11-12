import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { addTermDays, toIsoDate } from '@/lib/ciceron/case-files/business-days'

/**
 * Mirrors migration 322 intent: after freshness, sample deadlines should sit
 * at roughly 2 / 6 / 14 business days from today, never overdue.
 */
describe('freshness deadline offsets', () => {
  it('2, 6 and 14 business days from a weekday are future and ordered', () => {
    const today = '2026-11-12' // Thursday
    const d2 = addTermDays({ startIso: today, termDays: 2, dayCount: 'business' })
    const d6 = addTermDays({ startIso: today, termDays: 6, dayCount: 'business' })
    const d14 = addTermDays({ startIso: today, termDays: 14, dayCount: 'business' })

    assert.ok(d2.dueIso > today)
    assert.ok(d6.dueIso > d2.dueIso)
    assert.ok(d14.dueIso > d6.dueIso)
    // None overdue relative to today
    assert.ok(d2.dueIso >= '2026-11-13')
  })

  it('skips weekends when counting two business days from Friday', () => {
    const friday = '2026-11-13'
    const due = addTermDays({ startIso: friday, termDays: 2, dayCount: 'business' })
    assert.equal(due.dueIso, '2026-11-17') // Mon+Tue
    assert.equal(toIsoDate(new Date(Date.UTC(2026, 10, 17, 12))), '2026-11-17')
  })
})
