import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  matchEntry,
  matchEntries,
  type CatalogueMatter,
} from '@/lib/ciceron/boletines/matcher'
import {
  diceCoefficient,
  normaliseCourtName,
  normaliseExpediente,
  normalisePartyName,
  partyTokens,
  tokenJaccard,
} from '@/lib/ciceron/boletines/normalise'

describe('boletines normalise', () => {
  it('normalises expediente variants to number/year', () => {
    assert.equal(normaliseExpediente('123/2026'), '123/2026')
    assert.equal(normaliseExpediente('Exp. 123 / 2026'), '123/2026')
    assert.equal(normaliseExpediente('123-2026'), '123/2026')
    assert.equal(normaliseExpediente('Núm. 0123/26'), '123/2026')
    assert.equal(normaliseExpediente('toca 45/1999'), '45/1999')
  })

  it('normalises court ordinals and accents', () => {
    assert.equal(
      normaliseCourtName('Juzgado Primero de lo Civil'),
      normaliseCourtName('JUZGADO 1º CIVIL')
    )
    assert.ok(
      normaliseCourtName('Juzgado Séptimo Familiar').includes('7')
    )
  })

  it('strips corporate suffixes and accents from party names', () => {
    assert.equal(
      normalisePartyName('Acme Pagos, S.A. de C.V.'),
      normalisePartyName('ACME PAGOS SA DE CV')
    )
    assert.equal(
      normalisePartyName('José Núñez García'),
      'jose nunez garcia'
    )
  })

  it('compares party tokens order-insensitively', () => {
    const a = partyTokens('García López María')
    const b = partyTokens('María García López')
    assert.ok(tokenJaccard(a, b) >= 0.99)
  })

  it('dice coefficient is high for near spellings', () => {
    assert.ok(diceCoefficient('Constructora Delta', 'Constructora Deltha') > 0.8)
  })
})

describe('boletines matcher', () => {
  const catalogue: CatalogueMatter[] = [
    {
      id: 'cat-1',
      courtName: 'Juzgado Primero Civil de Querétaro',
      expedienteNumber: '123/2026',
      partyNameVariants: ['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
      matterId: 'm-1',
      caseFileId: 'cf-1',
    },
    {
      id: 'cat-2',
      courtName: 'Juzgado Segundo Familiar',
      expedienteNumber: '88/2025',
      partyNameVariants: ['María Elena Ríos Vargas'],
      matterId: 'm-2',
    },
  ]

  it('exact-matches on expediente + court', () => {
    const hits = matchEntry(
      {
        courtName: 'Juzgado 1º de lo Civil, Querétaro',
        expedienteNumber: 'Exp. 123/2026',
        partyNames: 'Otro Desconocido',
      },
      catalogue
    )
    assert.equal(hits.length, 1)
    assert.equal(hits[0]!.matchKind, 'exact')
    assert.equal(hits[0]!.score, 1)
    assert.match(hits[0]!.reason, /expediente/i)
    assert.match(hits[0]!.reason, /juzgado/i)
  })

  it('possible-matches on party name when expediente differs', () => {
    const hits = matchEntry(
      {
        courtName: 'Juzgado Tercero Civil',
        expedienteNumber: '999/2026',
        partyNames: 'Nexora Pagos S.A. de C.V.',
      },
      catalogue
    )
    assert.equal(hits.length, 1)
    assert.equal(hits[0]!.matchKind, 'possible')
    assert.ok(hits[0]!.score >= 0.72)
    assert.match(hits[0]!.reason, /parte/i)
  })

  it('possible-matches reordered party tokens', () => {
    const hits = matchEntry(
      {
        courtName: 'Otro',
        expedienteNumber: '1/2000',
        partyNames: 'Ríos Vargas María Elena',
      },
      catalogue
    )
    assert.equal(hits.length, 1)
    assert.equal(hits[0]!.catalogueId, 'cat-2')
    assert.equal(hits[0]!.matchKind, 'possible')
  })

  it('returns no hit when nothing aligns', () => {
    const hits = matchEntry(
      {
        courtName: 'Juzgado Penal',
        expedienteNumber: '1/1990',
        partyNames: 'Persona Inventada Demo',
      },
      catalogue
    )
    assert.equal(hits.length, 0)
  })

  it('every hit carries a non-empty reason', () => {
    const hits = matchEntries(
      [
        {
          courtName: 'Juzgado Primero Civil',
          expedienteNumber: '123/2026',
          partyNames: 'X',
        },
        {
          courtName: 'X',
          expedienteNumber: '0/0',
          parties: ['Nexora Pagos'],
        },
      ],
      catalogue
    )
    assert.ok(hits.length >= 2)
    for (const h of hits) {
      assert.ok(h.reason.trim().length > 10)
    }
  })

  it('prefers exact over also scoring party on same catalogue row', () => {
    const hits = matchEntry(
      {
        courtName: 'Juzgado Primero Civil de Querétaro',
        expedienteNumber: '123/2026',
        partyNames: 'Nexora Pagos, S.A.P.I. de C.V.',
      },
      catalogue
    )
    assert.equal(hits.length, 1)
    assert.equal(hits[0]!.matchKind, 'exact')
  })
})
