import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decidePublish, isClaimEligible, parseForce } from './publish-gate.ts'

test('locked prediction publishes', () => {
  assert.deepEqual(decidePublish({ ok: true, skipped: false, status: 'locked', locked_at: 'x' }), { publish: true, contraste: 'locked' })
  assert.deepEqual(decidePublish({ ok: true, skipped: true, reason: 'exists' }), { publish: true, contraste: 'already_locked' })
})

test('late lock still publishes but warns', () => {
  const d = decidePublish({ ok: true, skipped: false, status: 'late', locked_at: 'x' })
  assert.equal(d.publish, true)
  assert.equal(d.publish && d.contraste, 'late')
})

test('failed or timed-out lock keeps the Pulse a draft', () => {
  for (const error of ['timeout', 'no personas for cdmx-v1']) {
    const d = decidePublish({ ok: false, error })
    assert.equal(d.publish, false)
    assert.equal(!d.publish && d.code, 'contraste_lock_failed')
    assert.equal(!d.publish && d.canOverride, true)
  }
  const t = decidePublish({ ok: false, error: 'timeout' })
  assert.match(!t.publish ? t.error : '', /tardó demasiado/)
})

test('explicit admin override publishes unlocked', () => {
  const d = decidePublish({ ok: false, error: 'timeout' }, { force: true })
  assert.equal(d.publish, true)
  assert.equal(d.publish && d.contraste, 'override_unlocked')
  assert.match((d.publish && d.warning) || '', /tardía/)
})

test('override flag only from explicit truthy values', () => {
  assert.equal(parseForce(true), true)
  assert.equal(parseForce('true'), true)
  assert.equal(parseForce('1'), true)
  assert.equal(parseForce(undefined), false)
  assert.equal(parseForce('yes'), false)
  assert.equal(parseForce(false), false)
})

test('only locked, current-wording predictions back public claims', () => {
  assert.equal(isClaimEligible({ status: 'locked' }), true)
  assert.equal(isClaimEligible({ status: 'locked', stale: false }), true)
  assert.equal(isClaimEligible({ status: 'late' }), false)
  assert.equal(isClaimEligible({ status: 'locked', stale: true }), false)
  assert.equal(isClaimEligible(null), false)
})
