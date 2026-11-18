import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  currentCdmxBusinessDay,
  pickDemoBulletinPublicationDate,
} from '@/lib/ciceron/boletines/demo-freshness'

describe('pickDemoBulletinPublicationDate', () => {
  it('prefers an exact match for the current business day', () => {
    assert.equal(
      pickDemoBulletinPublicationDate('2026-11-19', [
        '2026-11-18',
        '2026-11-19',
      ]),
      '2026-11-19'
    )
  })

  it('rolls a stale seed date forward when today has no rows', () => {
    assert.equal(
      pickDemoBulletinPublicationDate('2026-11-19', ['2026-11-18']),
      '2026-11-18'
    )
  })

  it('returns null when no dates are available', () => {
    assert.equal(pickDemoBulletinPublicationDate('2026-11-19', []), null)
  })
})

describe('currentCdmxBusinessDay', () => {
  it('returns a weekday ISO date', () => {
    // Saturday 2026-11-21 18:00Z → still Friday evening CDMX (UTC−6)
    const saturdayUtc = new Date('2026-11-21T18:00:00.000Z')
    const day = currentCdmxBusinessDay(saturdayUtc)
    assert.match(day, /^\d{4}-\d{2}-\d{2}$/)
    const dow = new Date(`${day}T12:00:00.000Z`).getUTCDay()
    assert.ok(dow !== 0 && dow !== 6, `expected weekday, got ${day}`)
  })

  it('keeps a weekday unchanged', () => {
    // Wednesday 2026-11-18 18:00Z → 12:00 CDMX same calendar day
    assert.equal(
      currentCdmxBusinessDay(new Date('2026-11-18T18:00:00.000Z')),
      '2026-11-18'
    )
  })
})
