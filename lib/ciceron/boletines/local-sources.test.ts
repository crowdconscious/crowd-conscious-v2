import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  findLocalFuente,
  formatLocalFuenteCitation,
  formatLocalFuenteHeader,
  resolveHitFuenteLink,
} from './local-sources'

describe('findLocalFuente', () => {
  it('matches CDMX demo hit by expediente and court', () => {
    const match = findLocalFuente({
      sourceKey: 'cdmx_boletin_pj',
      bulletinDate: '2026-11-24',
      expediente: '1323/2024',
      courtName: 'Juzgado Trigésimo Segundo de lo Civil',
    })
    assert.ok(match)
    assert.equal(match!.entry.printedPage, 78)
    assert.equal(match!.entry.imagePath, '/ciceron/fuentes/cdmx/2026-11-24/p078.webp')
    assert.ok(match!.entry.highlight.y > 0.5)
  })

  it('formats citation and header in Spanish', () => {
    const match = findLocalFuente({
      expediente: '87/2023',
      courtName: 'Juzgado Trigésimo Segundo de lo Civil',
    })
    assert.ok(match)
    assert.equal(formatLocalFuenteCitation(match!), 'Boletín No. 199 · pág. 78')
    assert.match(formatLocalFuenteHeader(match!), /página 78 de 362/)
  })
})

describe('resolveHitFuenteLink', () => {
  it('routes to the local viewer when a locator exists', () => {
    const link = resolveHitFuenteLink({
      hitId: 'b7400000-0000-4000-8000-000000000102',
      expediente: '1323/2024',
      courtName: 'Juzgado Trigésimo Segundo de lo Civil',
      sourceUrl: 'https://edigital.example/visor',
    })
    assert.equal(link.external, false)
    assert.equal(
      link.href,
      '/ciceron/boletines/fuente/b7400000-0000-4000-8000-000000000102'
    )
    assert.equal(link.citation, 'Boletín No. 199 · pág. 78')
  })

  it('falls back to the external URL without a locator', () => {
    const link = resolveHitFuenteLink({
      hitId: 'hit-other',
      expediente: '999/1999',
      courtName: 'Juzgado Primero de Querétaro',
      sourceUrl: 'https://example.gob.mx/boletin',
    })
    assert.equal(link.external, true)
    assert.equal(link.href, 'https://example.gob.mx/boletin')
    assert.equal(link.citation, null)
  })
})
