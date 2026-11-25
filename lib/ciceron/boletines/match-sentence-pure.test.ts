import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildMatchSentenceParts,
  pickMatchPrimaryAction,
} from './match-sentence-pure'

describe('buildMatchSentenceParts', () => {
  it('builds client · court · requirement with meta', () => {
    const parts = buildMatchSentenceParts({
      clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
      clientSideLabel: 'actor',
      courtName: 'Juzgado Primero Civil de Querétaro',
      requirement: 'Se tiene por presentado el escrito de demanda.',
      publicationDateLabel: '18 de noviembre de 2026',
      expedienteNumber: '123/2026',
      deadlineLabel: '3 días hábiles',
    })
    assert.equal(parts.client, 'Nexora Pagos, S.A.P.I. de C.V.')
    assert.equal(parts.side, 'actor')
    assert.equal(parts.court, 'Juzgado Primero Civil de Querétaro')
    assert.match(parts.requirement, /escrito de demanda/)
    assert.match(parts.meta, /Exp\. 123\/2026/)
    assert.match(parts.meta, /Plazo: 3 días hábiles/)
  })
})

describe('pickMatchPrimaryAction', () => {
  it('prefers opening the expediente when linked', () => {
    const { primary, secondary } = pickMatchPrimaryAction({
      caseFileId: 'case-1',
      sourceUrl: 'https://example.gob.mx',
    })
    assert.equal(primary.id, 'open')
    assert.equal(secondary.map((a) => a.id).join(','), 'capture,review,source')
  })

  it('falls back to capture without expediente', () => {
    const { primary, secondary } = pickMatchPrimaryAction({
      caseFileId: null,
      sourceUrl: null,
    })
    assert.equal(primary.id, 'capture')
    assert.ok(!secondary.some((a) => a.id === 'capture'))
  })

  it('prefers the local fuente viewer over an external URL', () => {
    const { secondary } = pickMatchPrimaryAction({
      caseFileId: 'case-1',
      sourceUrl: 'https://example.gob.mx',
      localFuenteHref: '/ciceron/boletines/fuente/hit-1',
    })
    const source = secondary.find((a) => a.id === 'source')
    assert.ok(source)
    assert.equal(source!.href, '/ciceron/boletines/fuente/hit-1')
    assert.equal(source!.external, false)
  })
})
