import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FIRM_THRESHOLD, MIN_GROUP, computeHeadline, orderByFirmYes, segmentFor, percentagesSummingTo100, questionStats } from './firmness.ts'
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

test('yesCertainty averages only the «sí» answers', () => {
  const s = questionStats({ yes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 30], no: [30, 0, 0, 0, 0, 0, 0, 0, 0, 0] })
  assert.equal(s.yesCertainty, 10)
})

test('headline: both lines use share of «sí»; weakest ranked by firm-of-yes', () => {
  // A: 50% yes, all firm (firmYes 50 of total, firm-of-yes 100)
  const a = questionStats({ yes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 50], no: [0, 0, 0, 0, 0, 0, 0, 0, 0, 50] })
  // B: 100% yes, 60% firm (firmYes 60 of total but firm-of-yes 60) -> weakest by firm-of-yes
  const b = questionStats({ yes: [0, 0, 0, 0, 0, 40, 0, 0, 0, 60], no: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] })
  // C: 40% yes, 75% firm (firmYes 30 of total = lowest by old base, firm-of-yes 75)
  const c = questionStats({ yes: [0, 0, 0, 0, 10, 0, 0, 0, 0, 30], no: [0, 0, 0, 0, 0, 0, 0, 0, 0, 60] })
  const h = computeHeadline([{ text: 'A', stats: a }, { text: 'B', stats: b }, { text: 'C', stats: c }])
  assert.ok(h && h.kind === 'answer')
  assert.equal(h.pctFirmOfYes, 100)
  assert.deepEqual(h.weakest, { text: 'B', pctFirmOfYes: 60 })
})

test('order is weakest-first by firm-of-yes', () => {
  const mk = (firm: number, tent: number) => questionStats({ yes: [0, 0, 0, 0, tent, 0, 0, 0, 0, firm], no: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] })
  const o = orderByFirmYes([{ id: 1, stats: mk(90, 10) }, { id: 2, stats: mk(40, 60) }, { id: 3, stats: mk(70, 30) }])
  assert.deepEqual(o.map((x) => x.id), [2, 3, 1])
})

test('segmentFor: tryit highlight uses FIRM_THRESHOLD', () => {
  assert.equal(segmentFor('yes', 6), 'tentativeYes')
  assert.equal(segmentFor('yes', FIRM_THRESHOLD - 1), 'tentativeYes')
  assert.equal(segmentFor('yes', FIRM_THRESHOLD), 'firmYes')
  assert.equal(segmentFor('no', 9), 'firmNo')
  assert.equal(segmentFor('no', 3), 'tentativeNo')
})
