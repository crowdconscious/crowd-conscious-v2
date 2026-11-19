import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  GUIDED_SETUP_STEPS,
  nextSetupStep,
  parseGuidedSetupStorage,
  prevSetupStep,
  shouldShowGuidedSetup,
} from './guided-setup-pure'

describe('guided-setup-pure', () => {
  it('has three steps despacho → clientes → estados', () => {
    assert.deepEqual([...GUIDED_SETUP_STEPS], ['despacho', 'clientes', 'estados'])
  })

  it('advances and completes', () => {
    assert.equal(nextSetupStep(0), 1)
    assert.equal(nextSetupStep(1), 2)
    assert.equal(nextSetupStep(2), 'done')
    assert.equal(prevSetupStep(0), 0)
    assert.equal(prevSetupStep(2), 1)
  })

  it('hides when skipped or completed', () => {
    assert.equal(shouldShowGuidedSetup(null), true)
    assert.equal(
      shouldShowGuidedSetup({ skipped: true, completed: false, stepIndex: 0 }),
      false
    )
    assert.equal(
      shouldShowGuidedSetup({ skipped: false, completed: true, stepIndex: 2 }),
      false
    )
    assert.equal(
      shouldShowGuidedSetup(parseGuidedSetupStorage('{"stepIndex":1}')),
      true
    )
  })
})
