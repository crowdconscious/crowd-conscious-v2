import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canFinalApproveUnderFourEyes,
  isFourEyesOutputType,
} from '@/lib/ciceron/review/four-eyes'

describe('four-eyes', () => {
  it('detects configured output types', () => {
    assert.equal(isFourEyesOutputType('client_alert', ['client_alert']), true)
    assert.equal(isFourEyesOutputType('research_summary', ['client_alert']), false)
  })

  it('blocks corrected decision when four-eyes is on', () => {
    const r = canFinalApproveUnderFourEyes({
      fourEyesOn: true,
      decision: 'corrected',
      actorId: 'a',
      humanEditAuthorId: null,
    })
    assert.equal(r.ok, false)
  })

  it('blocks approve when actor authored the human edit', () => {
    const r = canFinalApproveUnderFourEyes({
      fourEyesOn: true,
      decision: 'approved',
      actorId: 'editor',
      humanEditAuthorId: 'editor',
    })
    assert.equal(r.ok, false)
  })

  it('allows approve by a different reviewer after edit', () => {
    const r = canFinalApproveUnderFourEyes({
      fourEyesOn: true,
      decision: 'approved',
      actorId: 'approver',
      humanEditAuthorId: 'editor',
    })
    assert.equal(r.ok, true)
  })

  it('allows reject regardless of four-eyes', () => {
    const r = canFinalApproveUnderFourEyes({
      fourEyesOn: true,
      decision: 'rejected',
      actorId: 'editor',
      humanEditAuthorId: 'editor',
    })
    assert.equal(r.ok, true)
  })
})
