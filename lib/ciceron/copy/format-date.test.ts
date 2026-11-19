import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatDateFilterEs,
  formatDateLongEs,
  formatDateShortEs,
  formatDateTimeEs,
  parseDateFilterEs,
} from '@/lib/ciceron/copy/format-date'

describe('formatDateLongEs / short / time (B1)', () => {
  it('formats calendar ISO as long Spanish', () => {
    assert.equal(formatDateLongEs('2026-11-14'), '14 de noviembre de 2026')
  })

  it('formats short Spanish without ISO', () => {
    assert.equal(formatDateShortEs('2026-11-14'), '14 nov 2026')
    assert.doesNotMatch(formatDateShortEs('2026-11-14'), /\d{4}-\d{2}-\d{2}/)
  })

  it('formats times in 24 h', () => {
    const out = formatDateTimeEs('2026-11-14T15:30:00.000Z') // 09:30 CDMX
    assert.match(out, /09:30/)
    assert.doesNotMatch(out, /a\.\s*m\.|p\.\s*m\.|AM|PM/i)
  })
})

describe('date filters dd/mm/aaaa (B2)', () => {
  it('formats and parses filter values', () => {
    assert.equal(formatDateFilterEs('2026-11-14'), '14/11/2026')
    assert.equal(parseDateFilterEs('14/11/2026'), '2026-11-14')
    assert.equal(parseDateFilterEs('bad'), null)
  })
})
