import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  fictionalMatterCountForState,
  fictionalTotalMatterCount,
  generateFictionalCatalogue,
} from '@/lib/ciceron/boletines/fictional-catalogue'
import { fixtureCases } from '@/lib/ciceron/demo/fixtures'
import { fixtureCaseDetails } from '@/lib/ciceron/case-files/fixtures-detail'
import { SAMPLE_CASE_EVENTS } from '@/lib/ciceron/case-files/sample-events'
import { displaySampleCase } from '@/lib/ciceron/case-files/display-sample'

describe('fictional catalogue (B6 F3)', () => {
  it('generates ~400 matters with ~250 in Ciudad de México', () => {
    const rows = generateFictionalCatalogue()
    assert.equal(rows.length, fictionalTotalMatterCount())
    assert.ok(rows.length >= 390 && rows.length <= 410)
    assert.equal(fictionalMatterCountForState('Ciudad de México'), 250)
    const cdmx = rows.filter((r) => r.stateName === 'Ciudad de México')
    assert.equal(cdmx.length, 250)
  })

  it('is deterministic', () => {
    const a = generateFictionalCatalogue()
    const b = generateFictionalCatalogue()
    assert.equal(a[0]!.expedienteNumber, b[0]!.expedienteNumber)
    assert.equal(a[199]!.courtName, b[199]!.courtName)
  })

  it('never uses DEMO- prefixes or federal court acronyms in the catalogue', () => {
    for (const row of generateFictionalCatalogue()) {
      assert.doesNotMatch(row.expedienteNumber, /DEMO-/i)
      assert.doesNotMatch(row.courtName, /\b(TFJA|SCJN|amparo)\b/i)
    }
  })
})

describe('state-style sample cases (B6 F1–F2)', () => {
  it('fixture file numbers have no DEMO- prefix', () => {
    for (const c of fixtureCases) {
      assert.doesNotMatch(c.fileNumber, /DEMO-/i)
      assert.doesNotMatch(c.court, /\b(TFJA|SCJN)\b/)
    }
    for (const d of Object.values(fixtureCaseDetails)) {
      assert.doesNotMatch(d.fileNumber, /DEMO-/i)
      assert.doesNotMatch(d.court, /\b(TFJA|SCJN)\b/)
    }
    for (const e of SAMPLE_CASE_EVENTS) {
      assert.ok(e.fileNumber)
      assert.doesNotMatch(e.fileNumber, /DEMO-/i)
    }
  })

  it('display remap strips legacy federal DEMO- seeds', () => {
    const d = displaySampleCase({
      fileNumber: 'DEMO-TFJA-1001/2026',
      court: 'TFJA Sala Regional Metropolitana',
    })
    assert.equal(d.fileNumber, '1001/2026')
    assert.match(d.court, /Civil de Proceso Oral/)
    assert.doesNotMatch(d.fileNumber, /DEMO-/i)
  })
})
