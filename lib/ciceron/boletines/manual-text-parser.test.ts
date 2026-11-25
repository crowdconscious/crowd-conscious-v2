import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseManualBulletinText,
  validateAndParseManualText,
} from '@/lib/ciceron/boletines/manual-text-parser'

const CDMX_SAMPLE = `
BOLETÍN JUDICIAL — DATOS DE DEMOSTRACIÓN

Juzgado Trigésimo Segundo de lo Civil
Exp. 87/2023
Actor: Constructora Delta, S.A. de C.V.
Demandado: María López Hernández
Se tiene por presentada la contestación de demanda.

JUZGADO DÉCIMO DE LO CIVIL
Núm. Exp. 12/2024
Actor: Banco Ejemplo, S.A.
Demandado: Juan Pérez García
Se señala fecha para audiencia preliminar.

Juzgado Primero de lo Familiar
Exp. 45/2022
Promovente: Ana Ruiz
contra
Pedro Ruiz
Se admite a trámite el juicio.
`.trim()

describe('parseManualBulletinText', () => {
  it('parses a CDMX-style sample with court headers and Exp. lines', () => {
    const entries = parseManualBulletinText(CDMX_SAMPLE)
    assert.ok(entries.length >= 3)

    const first = entries[0]
    assert.match(first.courtName ?? '', /Trigésimo Segundo de lo Civil/i)
    assert.equal(first.expedienteNumber, '87/2023')
    assert.ok((first.partyNames ?? '').includes('Constructora Delta'))
    assert.ok((first.parties ?? []).some((p) => /María López/i.test(p)))

    const second = entries[1]
    assert.match(second.courtName ?? '', /Décimo de lo Civil/i)
    assert.equal(second.expedienteNumber, '12/2024')

    const third = entries[2]
    assert.match(third.courtName ?? '', /Primero de lo Familiar/i)
    assert.equal(third.expedienteNumber, '45/2022')
  })

  it('accepts Núm. Exp. and Exp. variants', () => {
    const text = `
JUZGADO PRIMERO DE LO CIVIL
Núm. Exp. 99/2021
Actor: Acme
Demandado: Beta
`
    const [entry] = parseManualBulletinText(text)
    assert.equal(entry.expedienteNumber, '99/2021')
  })

  it('returns empty for blank input', () => {
    assert.deepEqual(parseManualBulletinText('   \n  '), [])
  })
})

describe('validateAndParseManualText', () => {
  it('rejects empty body', () => {
    const r = validateAndParseManualText('  ')
    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /vacío/i)
  })

  it('rejects text with no detectable entries', () => {
    const r = validateAndParseManualText('Hola mundo sin juzgado ni expediente.')
    assert.equal(r.ok, false)
  })

  it('accepts the CDMX sample', () => {
    const r = validateAndParseManualText(CDMX_SAMPLE)
    assert.equal(r.ok, true)
    assert.ok(r.entries.length >= 3)
  })
})
