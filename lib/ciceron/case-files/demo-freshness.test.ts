import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEMO_DEADLINE_BUSINESS_OFFSETS,
  demoDeadlineDueIsos,
  demoDeadlinesNoneOverdue,
} from '@/lib/ciceron/case-files/demo-freshness'

describe('demo-freshness deadline offsets', () => {
  it('exposes 2, 6, 14 business-day offsets', () => {
    assert.deepEqual([...DEMO_DEADLINE_BUSINESS_OFFSETS], [2, 6, 14])
  })

  it('places three sample deadlines on future business days only', () => {
    // Wednesday 2026-11-11 (no holiday in seed near this window for first offsets)
    const today = '2026-11-11'
    const dues = demoDeadlineDueIsos({
      todayIso: today,
      deadlineCount: 3,
      nonWorkingIsoDates: ['2026-11-16'], // Revolución Mexicana
    })
    assert.equal(dues.length, 3)
    assert.ok(demoDeadlinesNoneOverdue(dues, today))
    // +2 business: Thu 12, Fri 13
    assert.equal(dues[0], '2026-11-13')
    // +6 business from Wed 11: 12,13,17,18,19,20 (skip weekend + Mon 16 holiday)
    assert.equal(dues[1], '2026-11-20')
    // +14 business lands further out, still after today
    assert.ok(dues[2]! > today)
    assert.ok(dues[0]! < dues[1]!)
    assert.ok(dues[1]! < dues[2]!)
  })

  it('cycles offsets when more than three deadlines', () => {
    const dues = demoDeadlineDueIsos({
      todayIso: '2026-11-11',
      deadlineCount: 4,
      nonWorkingIsoDates: [],
    })
    assert.equal(dues[0], dues[3])
  })
})
