import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decide, expiryFrom, lifecycleOf, locationCanJoin, renewOrLapse, srcSlugFor, suspicionOf, VALUES } from './rules.ts'

const ok = { weeksOk: 4, totalVoters: 25, droppedVoterWeeks: 0, topIpVoters: 2 }

test('7 values, unique keys', () => {
  assert.equal(VALUES.length, 7)
  assert.equal(new Set(VALUES.map((v) => v.key)).size, 7)
})

test('thresholds: 4 weeks AND 25 voters AND pledge', () => {
  assert.deepEqual(decide(ok, true), { kind: 'award' })
  assert.deepEqual(decide({ ...ok, weeksOk: 3 }, true), { kind: 'not_yet', missing: ['weeks'] })
  assert.deepEqual(decide({ ...ok, totalVoters: 24 }, true), { kind: 'not_yet', missing: ['voters'] })
  assert.deepEqual(decide(ok, false), { kind: 'not_yet', missing: ['pledge'] })
})

test('suspicious → pending, never auto-award', () => {
  assert.deepEqual(decide({ ...ok, droppedVoterWeeks: 1 }, true), { kind: 'pending', reasons: ['ip_cap_hit'] })
  assert.deepEqual(suspicionOf({ ...ok, topIpVoters: 8 }), ['ip_concentration'])
})

test('yearly expiry and lifecycle', () => {
  const e = expiryFrom(new Date('2026-10-16T00:00:00Z'))
  assert.equal(e.toISOString(), '2027-10-16T00:00:00.000Z')
  assert.equal(lifecycleOf(e, new Date('2027-01-01T00:00:00Z')), 'active')
  assert.equal(lifecycleOf(e, new Date('2027-10-01T00:00:00Z')), 'renewal_due')
  assert.equal(lifecycleOf(e, new Date('2027-10-16T00:00:01Z')), 'lapse')
})

test('renewal', () => {
  assert.equal(renewOrLapse({ awardedBy: 'auto', progress: ok, pledgeCurrent: true }), 'renew')
  assert.equal(renewOrLapse({ awardedBy: 'auto', progress: { ...ok, weeksOk: 1 }, pledgeCurrent: true }), 'lapse')
  assert.equal(renewOrLapse({ awardedBy: 'auto', progress: ok, pledgeCurrent: false }), 'lapse')
  assert.equal(renewOrLapse({ awardedBy: 'auto_paid', billingActive: true, pledgeCurrent: true }), 'renew')
  assert.equal(renewOrLapse({ awardedBy: 'auto_paid', billingActive: false, pledgeCurrent: true }), 'lapse')
})

test('src slug', () => {
  assert.equal(srcSlugFor('Café Ñandú'), 'qr_cafe-nandu')
  assert.match(srcSlugFor('x'.repeat(80)), /^qr_x{37}$/)
  assert.ok(locationCanJoin('pending') && locationCanJoin('active') && !locationCanJoin('revoked'))
})
