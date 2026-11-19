import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatClientIndustryEs } from './industry-label'

describe('formatClientIndustryEs', () => {
  it('maps known seed slugs', () => {
    assert.equal(formatClientIndustryEs('fintech'), 'Fintech')
    assert.equal(formatClientIndustryEs('comercio_exterior'), 'Comercio exterior')
  })

  it('capitalizes unknown single-word slugs', () => {
    assert.equal(formatClientIndustryEs('salud'), 'Salud')
  })

  it('passes through Spanish labels', () => {
    assert.equal(formatClientIndustryEs('Energía renovable'), 'Energía renovable')
  })
})
