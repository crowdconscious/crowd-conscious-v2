import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEMO_CLOCK_MORNING_HM,
  bulletinClockStrip,
  minutesFromMidnight,
  remainingToMilestone,
  uncoveredEntityCount,
} from '@/lib/ciceron/boletines/clock'

describe('bulletin clock', () => {
  it('computes remaining time before objetivo', () => {
    const r = remainingToMilestone('09:30', '08:00')
    assert.equal(r.passed, false)
    assert.equal(r.label, '1 h 30 min')
  })

  it('marks passed milestones', () => {
    assert.equal(remainingToMilestone('09:30', '10:00').passed, true)
  })

  it('counts uncovered entities', () => {
    assert.equal(
      uncoveredEntityCount([
        { status: 'revisado' },
        { status: 'fallo' },
        { status: 'manual' },
      ]),
      2
    )
  })

  it('parses HH:MM to minutes', () => {
    assert.equal(minutesFromMidnight('12:00'), 720)
  })

  it('demo mode after hours anchors to morning and avoids Hora vencida', () => {
    // 21:00 CDMX ≈ 03:00 UTC next day in winter; use explicit local via Date with offset.
    const evening = new Date('2026-11-19T21:00:00-06:00')
    const strip = bulletinClockStrip(evening, { demoMode: true })
    assert.equal(strip.demoAnchored, true)
    assert.match(strip.nowHm, new RegExp(DEMO_CLOCK_MORNING_HM))
    assert.equal(strip.objetivo.passed, false)
    assert.equal(strip.respaldo.passed, false)
    assert.equal(strip.limite.passed, false)
  })
})
