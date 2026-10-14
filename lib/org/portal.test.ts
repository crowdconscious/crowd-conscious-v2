import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregateCsv, answersCsv, type RawAnswer } from './csv.ts'
import { DEMO_READINGS } from './demo-data.ts'
import { toClientReading } from './readings.ts'
import { canCloseEarly, canExtend, canSetVisibility, DEFAULT_RULES, selloEarned } from './rules.ts'
import { phraseFor, readingHeadline } from './headline-copy.ts'
import { buildReportContent } from './report-content.ts'

const closed = toClientReading(DEMO_READINGS.find((r) => r.id === 'hospitalizacion-2026-q4')!)

test('defaults: no extension, early close allowed and preliminary under 30', () => {
  const s = { status: 'field' as const, fieldCloses: new Date(Date.now() + 86400000).toISOString(), extendedDays: 0, responded: 12 }
  assert.equal(canExtend(DEFAULT_RULES, s, 1).ok, false)
  assert.deepEqual(canCloseEarly(DEFAULT_RULES, s), { ok: true, preliminary: true })
  assert.equal(canExtend({ ...DEFAULT_RULES, maxExtensionDays: 7 }, s, 7).ok, true)
  assert.equal(canExtend({ ...DEFAULT_RULES, maxExtensionDays: 7 }, { ...s, extendedDays: 3 }, 5).ok, false)
  assert.equal(canCloseEarly({ ...DEFAULT_RULES, allowEarlyClose: false }, s).ok, false)
  assert.equal(canSetVisibility('design'), true)
  assert.equal(canSetVisibility('field'), false)
})

test('sello: paying AND a closed public reading, nothing else', () => {
  assert.equal(selloEarned('active', [{ status: 'closed', visibility: 'public' }]), true)
  assert.equal(selloEarned('inactive', [{ status: 'closed', visibility: 'public' }]), false)
  assert.equal(selloEarned('active', [{ status: 'closed', visibility: 'private' }]), false)
  assert.equal(selloEarned('active', [{ status: 'field', visibility: 'public' }]), false)
})

test('every deep-dive headline names its question', () => {
  const k = buildReportContent(closed, 'X', 'es')
  for (const d of k.deepDives) assert.match(d.headline!, /^De su \d+% que .+, \d+% lo dijo con firmeza\.$/)
  assert.ok(k.deepDives.some((d) => d.headline!.includes('consideró razonable el tiempo de espera')))
  assert.equal(phraseFor({ text: { es: '¿P?', en: 'Q?' } }, 'es'), 'que respondió «sí» a «¿P?»')
  assert.ok(readingHeadline(closed.questions, 'en')!.main.startsWith('Of the '))
})

test('no credentials in report content', () => {
  const k = JSON.stringify(buildReportContent(closed, 'X', 'es')) + JSON.stringify(buildReportContent(closed, 'X', 'en'))
  assert.doesNotMatch(k, /Hecho en M|Leaders in Innovation|Royal Academy/i)
})

test('aggregate CSV has no ids', () => {
  const csv = aggregateCsv(closed, 'es')
  assert.ok(csv.startsWith('\uFEFFpregunta_num'))
  assert.doesNotMatch(csv, /hospitalizacion|q1|q2/)
})

test('answers CSV: suppressed under 30, small segments dropped, reasons redacted, no ids', () => {
  const small = { ...closed, responded: 29 }
  assert.deepEqual(answersCsv(small, [], 'es'), { ok: false, reason: 'too_few_responses' })
  const q = closed.questions[0]
  const answers: RawAnswer[] = []
  for (let i = 0; i < 12; i++) answers.push({ questionId: q.id, answer: true, certainty: 9, reason: i === 0 ? 'Llamé al 55 1234 5678, la Dra. Pérez me atendió' : null })
  for (let i = 0; i < 3; i++) answers.push({ questionId: q.id, answer: false, certainty: 10, reason: 'muy mal' })
  const res = answersCsv(closed, answers, 'es')
  assert.ok(res.ok)
  if (!res.ok) return
  assert.equal(res.suppressedSegments, 1)
  assert.doesNotMatch(res.csv, /muy mal/)
  assert.doesNotMatch(res.csv, /1234|Pérez/)
  assert.doesNotMatch(res.csv, new RegExp(q.id + ','))
  assert.equal(res.csv.split('\r\n').filter((l) => l.startsWith('1,')).length, 12)
})
