import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  budgetStatusFromSpend,
  isDofExemptPurpose,
} from './budget'

describe('ciceron gateway budget', () => {
  it('alerts at 50, 80 and 100 percent', () => {
    assert.equal(budgetStatusFromSpend(24, 50).threshold, 0)
    assert.equal(budgetStatusFromSpend(25, 50).threshold, 50)
    assert.equal(budgetStatusFromSpend(40, 50).threshold, 80)
    const full = budgetStatusFromSpend(50, 50)
    assert.equal(full.threshold, 100)
    assert.equal(full.researchPaused, true)
    assert.match(full.message ?? '', /investigación está en pausa/i)
    assert.match(full.alertMessage ?? '', /Diario Oficial continúa/i)
  })

  it('exempts DOF monitoring purposes', () => {
    assert.equal(isDofExemptPurpose('dof_classify'), true)
    assert.equal(isDofExemptPurpose('dof_embed_chunks'), true)
    assert.equal(isDofExemptPurpose('research_answer'), false)
    assert.equal(isDofExemptPurpose('research_query_embed'), false)
  })
})
