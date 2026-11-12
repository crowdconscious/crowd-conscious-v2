import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  dateInMexicoCity,
  isDueOnOrAfterTodayCdmx,
  isDueWithinNextDaysCdmx,
  todayInMexicoCity,
} from './dates'

describe('ciceron CDMX deadline filters', () => {
  it('maps UTC evenings to the prior CDMX calendar day', () => {
    // 2026-11-13 05:00Z is still 2026-11-12 23:00 in CDMX (UTC−6)
    assert.equal(dateInMexicoCity('2026-11-13T05:00:00.000Z'), '2026-11-12')
    assert.equal(dateInMexicoCity('2026-11-13T06:00:00.000Z'), '2026-11-13')
  })

  it('excludes due dates before today CDMX', () => {
    const today = '2026-11-12'
    assert.equal(isDueOnOrAfterTodayCdmx('2026-11-11T18:00:00.000Z', today), false)
    assert.equal(isDueOnOrAfterTodayCdmx('2026-11-12T18:00:00.000Z', today), true)
  })

  it('keeps only the next N inclusive calendar days', () => {
    const today = '2026-11-12'
    assert.equal(isDueWithinNextDaysCdmx('2026-11-11T18:00:00.000Z', 15, today), false)
    assert.equal(isDueWithinNextDaysCdmx('2026-11-12T12:00:00.000Z', 15, today), true)
    assert.equal(isDueWithinNextDaysCdmx('2026-11-27T12:00:00.000Z', 15, today), true)
    assert.equal(isDueWithinNextDaysCdmx('2026-11-28T12:00:00.000Z', 15, today), false)
  })

  it('todayInMexicoCity returns yyyy-mm-dd', () => {
    assert.match(todayInMexicoCity(), /^\d{4}-\d{2}-\d{2}$/)
  })
})
