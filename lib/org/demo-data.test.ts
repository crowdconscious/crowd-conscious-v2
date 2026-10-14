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

test('Q4 Q3 firm share of «sí» comes from raw counts with one rounding step', async () => {
  const { questionStats } = await import('./firmness.ts')
  const q3 = DEMO_READINGS.find((r) => r.id === 'hospitalizacion-2026-q4')!.questions[2]
  const yes = q3.counts.yes.reduce((a, b) => a + b, 0)
  const firm = q3.counts.yes.slice(7).reduce((a, b) => a + b, 0)
  assert.equal(yes, 255)
  assert.equal(firm, 96)
  const s = questionStats(q3.counts)
  assert.equal(s.pctFirmOfYes, Math.round((96 / 255) * 100)) // 37.6 -> 38, not 23/62 from rounded segments
  assert.equal(s.pctFirmOfYes, 38)
  assert.equal(s.split.firmYes, 23)
  assert.equal(s.pctYes, 62)
})

test('headline names the lead question when a phrase exists, generic otherwise', async () => {
  const { readingHeadline } = await import('./headline-copy.ts')
  const { toClientReading } = await import('./readings.ts')
  const r = toClientReading(DEMO_READINGS.find((x) => x.id === 'hospitalizacion-2026-q4')!)
  assert.equal(readingHeadline(r.questions, 'es')!.main, 'De su 91% que recomendaría el hospital, 58% lo dijo con firmeza.')
  assert.equal(readingHeadline(r.questions, 'en')!.main, 'Of the 91% who would recommend the hospital, 58% said it firmly.')
  const noPhrase = r.questions.map(({ headlinePhrase, ...q }) => q)
  assert.equal(readingHeadline(noPhrase, 'es')!.main, 'De su 91% de «sí», 58% lo dijo con firmeza.')
})
