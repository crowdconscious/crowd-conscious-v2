import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEMO_READINGS, ILLUSTRATIVE_PAIR } from './demo-data.ts'
import { questionStats } from './firmness.ts'
import { toClientReading } from './readings.ts'

test('demo histograms add up to responses, segments to 100', () => {
  for (const r of DEMO_READINGS.filter((x) => x.status === 'closed')) {
    for (const q of r.questions) {
      const s = questionStats(q.counts)
      assert.equal(s.responses, r.responded, `${r.id}/${q.id}`)
      const t = s.split
      assert.equal(t.firmYes + t.tentativeYes + t.tentativeNo + t.firmNo, 100)
    }
  }
})

test('lead headline of the default demo reading matches the pack example', () => {
  const r = toClientReading(DEMO_READINGS.find((x) => x.id === 'hospitalizacion-2026-q4')!)
  assert.equal(r.questions[0].stats.pctYes, 91)
  assert.equal(r.questions[0].stats.pctFirmOfYes, 58)
})

test('illustrative pair: same 98% yes', () => {
  for (const p of ILLUSTRATIVE_PAIR) assert.equal(questionStats(p.counts).pctYes, 98)
})

test('client view never carries raw reasons; small groups hidden', () => {
  const view = DEMO_READINGS.map(toClientReading)
  const json = JSON.stringify(view)
  assert.ok(!json.includes('55 0000 0000'))
  assert.ok(!/diabetes/i.test(json))
  assert.ok(!json.includes('oculto por tamaño'))
  const pilotQ3 = view.find((r) => r.id === 'piloto-2026-q2')!.questions[2]
  assert.equal(pilotQ3.reasons.no.hidden, true)
})

test('no partial results while in field (rule 5)', () => {
  const field = DEMO_READINGS.find((x) => x.status === 'field')!
  const leaked = { ...field, questions: DEMO_READINGS[1].questions }
  const view = toClientReading(leaked)
  assert.equal(view.questions.length, 0)
  assert.ok(!JSON.stringify(view).includes('"yes"'))
})
