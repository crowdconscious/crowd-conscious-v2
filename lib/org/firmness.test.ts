import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FIRM_THRESHOLD, MIN_GROUP, computeHeadline, percentagesSummingTo100, questionStats } from './firmness.ts'
import { reasonGroup, redactReason } from './redact.ts'

test('threshold defaults', () => {
  assert.equal(FIRM_THRESHOLD, 8)
  assert.equal(MIN_GROUP, 10)
})

test('percentages always sum to 100', () => {
  for (const c of [[1, 1, 1], [412, 0, 0, 0], [7, 13, 29, 51], [33, 33, 34, 0], [1, 2, 3, 4]]) {
    assert.equal(percentagesSummingTo100(c).reduce((a, b) => a + b, 0), 100)
  }
  assert.deepEqual(percentagesSummingTo100([0, 0]), [0, 0])
})

test('split uses FIRM_THRESHOLD', () => {
  const yes = [0, 0, 0, 0, 0, 0, 10, 10, 0, 0] // certainty 7 tentative, 8 firm
  const no = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  const s = questionStats({ yes, no })
  assert.equal(s.pctFirmOfYes, 50)
  assert.equal(s.split.firmYes + s.split.tentativeYes + s.split.tentativeNo + s.split.firmNo, 100)
})

test('preliminary under 30 responses', () => {
  const s = questionStats({ yes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 20], no: [0, 0, 0, 0, 0, 0, 0, 0, 0, 5] })
  assert.equal(s.preliminary, true)
  assert.deepEqual(computeHeadline([{ text: 'q', stats: s }]), { kind: 'preliminary' })
})

test('redaction', () => {
  const r = redactReason('El Dr. Juan Pérez me atendió, llamé al 55 0000 0000 y escribí a ana@example.com por mi diabetes tipo 2')
  assert.ok(!r.includes('Juan'))
  assert.ok(!r.includes('0000'))
  assert.ok(!r.includes('@'))
  assert.ok(!/diabetes/i.test(r))
})

test('reasons hidden under MIN_GROUP', () => {
  assert.deepEqual(reasonGroup(MIN_GROUP - 1, [{ text: 'x', certainty: 3 }]), { hidden: true, groupSize: MIN_GROUP - 1 })
  const g = reasonGroup(MIN_GROUP, [{ text: 'x', certainty: 3 }])
  assert.equal(g.hidden, false)
})
