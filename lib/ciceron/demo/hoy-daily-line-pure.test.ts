import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildHoyDailyLine,
  soonestDueIso,
  weekdayNameEsFromIso,
} from './hoy-daily-line-pure'

describe('weekdayNameEsFromIso', () => {
  it('names Thursday for 2026-11-19', () => {
    assert.equal(weekdayNameEsFromIso('2026-11-19T23:59:00-06:00'), 'jueves')
  })
})

describe('soonestDueIso', () => {
  it('picks the earliest ISO', () => {
    assert.equal(
      soonestDueIso(['2026-11-20', null, '2026-11-19T12:00:00-06:00']),
      '2026-11-19T12:00:00-06:00'
    )
  })
})

describe('buildHoyDailyLine', () => {
  it('matches the partner-facing example shape', () => {
    const line = buildHoyDailyLine({
      asuntosMoved: 2,
      plazosThisWeek: 1,
      nextPlazoWeekday: 'jueves',
    })
    assert.equal(
      line,
      'Hoy: 2 asuntos se movieron, 1 plazo el jueves, todo lo demás sin novedades.'
    )
  })

  it('handles a quiet morning with reviews', () => {
    const line = buildHoyDailyLine({
      asuntosMoved: 0,
      plazosThisWeek: 0,
      nextPlazoWeekday: null,
      reviewsPending: 2,
    })
    assert.match(line, /ningún asunto se movió/)
    assert.match(line, /2 revisiones pendientes/)
  })

  it('mentions pending reviews even when there is other news', () => {
    const line = buildHoyDailyLine({
      asuntosMoved: 4,
      plazosThisWeek: 1,
      nextPlazoWeekday: 'sábado',
      reviewsPending: 5,
    })
    assert.match(line, /4 asuntos se movieron/)
    assert.match(line, /5 revisiones pendientes/)
    assert.doesNotMatch(line, /sin novedades/)
  })
})
