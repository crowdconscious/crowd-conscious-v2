import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifyAlertDates,
  formatAlertDatesForPrompt,
  markPassedDatesInText,
  parseLooseDateToIso,
} from '@/lib/ciceron/review/alert-dates'

describe('alert-dates', () => {
  it('parses ISO and Spanish dates', () => {
    assert.equal(parseLooseDateToIso('2026-11-01'), '2026-11-01')
    assert.equal(
      parseLooseDateToIso('15 de enero de 2026'),
      '2026-01-15'
    )
  })

  it('marks past dates as passed relative to today', () => {
    const statuses = classifyAlertDates(
      ['2026-01-01', '2026-12-31', 'sin fecha'],
      '2026-11-12'
    )
    assert.equal(statuses[0]!.passed, true)
    assert.equal(statuses[1]!.passed, false)
    assert.equal(statuses[2]!.passed, false)
    assert.match(formatAlertDatesForPrompt(statuses), /FECHA VENCIDA/)
  })

  it('annotates past ISO dates in draft body without duplicating', () => {
    const body =
      'La obligación rige desde 2026-01-15. El plazo futuro es 2027-06-01.'
    const marked = markPassedDatesInText(body, '2026-11-12')
    assert.match(marked, /2026-01-15 \(fecha vencida\)/)
    assert.match(marked, /2027-06-01/)
    assert.equal(markPassedDatesInText(marked, '2026-11-12'), marked)
  })
})
