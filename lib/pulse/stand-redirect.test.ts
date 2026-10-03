import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildStandRedirectUrl,
  cdmxToday,
  DEFAULT_STAND_EVENT_TAG,
  pickStandPulse,
  resolveStandEventTag,
  type StandPulseRow,
} from './stand-redirect.ts'

function row(
  partial: Partial<StandPulseRow> & { id: string; stand_day?: string }
): StandPulseRow {
  const { stand_day, id, published_at, created_at, metadata } = partial
  return {
    id,
    published_at: published_at ?? '2026-10-06T13:30:00.000Z',
    created_at: created_at ?? '2026-10-01T12:00:00.000Z',
    metadata: stand_day ? { stand_day } : (metadata ?? {}),
  }
}

describe('cdmxToday', () => {
  it('treats 2026-10-07T05:30Z as still Oct 6 in CDMX (UTC-6 / CDT)', () => {
    // 05:30 UTC = 23:30 previous day in America/Mexico_City (CDT, UTC-6).
    assert.equal(cdmxToday(new Date('2026-10-07T05:30:00.000Z')), '2026-10-06')
  })

  it('rolls to Oct 7 after midnight CDMX', () => {
    // 06:30 UTC = 00:30 CDMX on Oct 7.
    assert.equal(cdmxToday(new Date('2026-10-07T06:30:00.000Z')), '2026-10-07')
  })
})

describe('resolveStandEventTag', () => {
  it('defaults to semana-accion-stand', () => {
    assert.equal(resolveStandEventTag(null), DEFAULT_STAND_EVENT_TAG)
    assert.equal(resolveStandEventTag(''), DEFAULT_STAND_EVENT_TAG)
    assert.equal(resolveStandEventTag('!!!'), DEFAULT_STAND_EVENT_TAG)
  })

  it('maps ?event=<slug> to <slug>-stand', () => {
    assert.equal(resolveStandEventTag('semana-accion'), 'semana-accion-stand')
    assert.equal(resolveStandEventTag('future-fest'), 'future-fest-stand')
  })
})

describe('pickStandPulse', () => {
  const oct6 = row({
    id: 'day-6',
    stand_day: '2026-10-06',
    published_at: '2026-10-06T13:30:00.000Z',
  })
  const oct7 = row({
    id: 'day-7',
    stand_day: '2026-10-07',
    published_at: '2026-10-07T13:30:00.000Z',
  })
  const oct8 = row({
    id: 'day-8',
    stand_day: '2026-10-08',
    published_at: '2026-10-08T13:30:00.000Z',
  })

  it('picks today\'s stand_day match', () => {
    const picked = pickStandPulse([oct6, oct7, oct8], '2026-10-07')
    assert.equal(picked?.id, 'day-7')
  })

  it('before conference (no today match) → most recently published', () => {
    const picked = pickStandPulse([oct6], '2026-10-05')
    assert.equal(picked?.id, 'day-6')
  })

  it('after conference → most recently published (Oct 8)', () => {
    const picked = pickStandPulse([oct6, oct7, oct8], '2026-10-09')
    assert.equal(picked?.id, 'day-8')
  })

  it('today\'s Pulse not yet published → falls back to latest published', () => {
    // Only Oct 6 is in the published set; today is Oct 7.
    const picked = pickStandPulse([oct6], '2026-10-07')
    assert.equal(picked?.id, 'day-6')
  })

  it('none published → null (caller redirects to results)', () => {
    assert.equal(pickStandPulse([], '2026-10-07'), null)
  })

  it('when several share today\'s stand_day, picks latest published_at', () => {
    const older = row({
      id: 'day-7-old',
      stand_day: '2026-10-07',
      published_at: '2026-10-07T12:00:00.000Z',
    })
    const newer = row({
      id: 'day-7-new',
      stand_day: '2026-10-07',
      published_at: '2026-10-07T14:00:00.000Z',
    })
    const picked = pickStandPulse([older, newer, oct6], '2026-10-07')
    assert.equal(picked?.id, 'day-7-new')
  })
})

describe('buildStandRedirectUrl', () => {
  it('preserves via/src/utm params and drops consumed event', () => {
    const incoming = new URLSearchParams(
      'via=semana-accion&src=qr&utm_campaign=stand&event=semana-accion'
    )
    const url = buildStandRedirectUrl(
      'https://www.crowdconscious.app',
      '/pulse/abc-123',
      incoming
    )
    assert.equal(url.pathname, '/pulse/abc-123')
    assert.equal(url.searchParams.get('via'), 'semana-accion')
    assert.equal(url.searchParams.get('src'), 'qr')
    assert.equal(url.searchParams.get('utm_campaign'), 'stand')
    assert.equal(url.searchParams.get('event'), null)
  })

  it('builds results fallback with params preserved', () => {
    const incoming = new URLSearchParams('via=semana-accion&src=qr')
    const url = buildStandRedirectUrl(
      'https://www.crowdconscious.app',
      '/pulse/results',
      incoming
    )
    assert.equal(url.pathname, '/pulse/results')
    assert.equal(url.searchParams.get('via'), 'semana-accion')
    assert.equal(url.searchParams.get('src'), 'qr')
  })
})
