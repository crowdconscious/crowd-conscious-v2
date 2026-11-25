import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  WHATSAPP_HEADLINE_MAX,
  formatTodayBulletinWhatsAppHeadline,
  officialBulletinNo,
  pickSampleBulletinHit,
  shortCourtLabel,
} from './today-bulletin-headline-pure'

describe('shortCourtLabel', () => {
  it('shortens ordinary and oral CDMX courts', () => {
    assert.equal(
      shortCourtLabel('Juzgado Trigésimo Segundo de lo Civil'),
      'Juzgado 32 Civil'
    )
    assert.equal(
      shortCourtLabel('Juzgado Décimo Primero de lo Civil'),
      'Juzgado 11 Civil'
    )
    assert.equal(
      shortCourtLabel('Juzgado Trigésimo Primero de lo Civil de Proceso Oral'),
      'Juzgado 31 Civil Oral'
    )
  })
})

describe('formatTodayBulletinWhatsAppHeadline', () => {
  it('matches the demo CDMX No. 200 line and stays within 90 chars', () => {
    const line = formatTodayBulletinWhatsAppHeadline({
      stateCode: 'CDMX',
      bulletinNumber: '200',
      count: 8,
      courtName: 'Juzgado Trigésimo Segundo de lo Civil',
      expediente: '51/2026',
    })
    assert.equal(
      line,
      'Boletín Judicial CDMX No. 200: 8 coincidencias (Juzgado 32 Civil, 51/2026 y más)'
    )
    assert.ok((line ?? '').length <= WHATSAPP_HEADLINE_MAX)
  })

  it('returns null when there are no hits', () => {
    assert.equal(
      formatTodayBulletinWhatsAppHeadline({
        stateCode: 'CDMX',
        bulletinNumber: '200',
        count: 0,
      }),
      null
    )
  })
})

describe('pickSampleBulletinHit', () => {
  it('prefers the shortest expediente', () => {
    const sample = pickSampleBulletinHit([
      {
        sourceId: 'cdmx',
        bulletinNumber: '200',
        courtName: 'Juzgado Décimo Primero de lo Civil',
        expediente: '1622/2024',
      },
      {
        sourceId: 'cdmx',
        bulletinNumber: '200',
        courtName: 'Juzgado Trigésimo Segundo de lo Civil',
        expediente: '51/2026',
      },
    ])
    assert.equal(sample?.expediente, '51/2026')
  })
})

describe('officialBulletinNo', () => {
  it('extracts a trailing official number', () => {
    assert.equal(officialBulletinNo('200'), '200')
    assert.equal(officialBulletinNo('Boletín 200'), '200')
  })
})
