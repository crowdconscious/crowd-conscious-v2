import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregateOrgRuns, buildOrgUserPrompt, orgGap, orgGapLine, parseOrgAnswers, questionHash } from './org-core.ts'
import { DEMO_READINGS } from '../org/demo-data.ts'
import { toClientReading, withoutContraste } from '../org/readings.ts'

test('parse org answers: all-or-nothing, accents, order', () => {
  assert.deepEqual(parseOrgAnswers('{"answers":[{"q":1,"answer":"sí","confidence":8},{"q":2,"answer":"no","confidence":3}]}', 2), [
    { yes: true, certainty: 8 },
    { yes: false, certainty: 3 },
  ])
  assert.deepEqual(parseOrgAnswers('```json\n{"answers":[{"q":2,"answer":"si","confidence":5},{"q":1,"answer":"No","confidence":9}]}\n```', 2), [
    { yes: false, certainty: 9 },
    { yes: true, certainty: 5 },
  ])
  assert.equal(parseOrgAnswers('{"answers":[{"q":1,"answer":"si","confidence":8}]}', 2), null) // missing q2
  assert.equal(parseOrgAnswers('{"answers":[{"q":1,"answer":"tal vez","confidence":8}]}', 1), null)
  assert.equal(parseOrgAnswers('{"answers":[{"q":1,"answer":"si","confidence":11}]}', 1), null)
  assert.equal(parseOrgAnswers('{"answers":[{"q":1,"answer":"si","confidence":5},{"q":1,"answer":"no","confidence":5}]}', 1), null)
  assert.equal(parseOrgAnswers('not json', 1), null)
})

test('aggregate: mean, spread, histograms', () => {
  const Y = (c: number) => ({ yes: true, certainty: c })
  const N = (c: number) => ({ yes: false, certainty: c })
  const runs = [
    [[Y(8)], [Y(6)], [N(2)], [N(4)]], // 0.5
    [[Y(8)], [Y(8)], [Y(8)], [N(4)]], // 0.75
    [], // failed run ignored
  ]
  const [a] = aggregateOrgRuns(runs, 1)
  assert.equal(a.yes_share, 0.625)
  assert.equal(a.yes_spread, 0.1768)
  assert.equal(a.yes_certainty['8'], 4)
  assert.equal(a.no_certainty['4'], 2)
  assert.equal(a.runs.length, 2)
})

test('gap line + hash + prompt', () => {
  assert.equal(orgGap(0.66, 84), 18)
  assert.match(orgGapLine(0.66, 84, 'es'), /18 puntos más/)
  assert.match(orgGapLine(0.7, 72, 'en'), /intuition holds/)
  const s = { orgName: 'X', title: 'T', locale: 'es' as const, questions: [{ id: 'a', position: 1, text: '¿Sí?' }] }
  assert.equal(questionHash(s, '¿Sí?'), questionHash(s, ' ¿Sí? '))
  assert.notEqual(questionHash(s, '¿Sí?'), questionHash(s, '¿No?'))
  assert.match(buildOrgUserPrompt(s), /1\. ¿Sí\?/)
})

test('visibility: no contraste before close; share links strip it', () => {
  const closed = toClientReading(DEMO_READINGS.find((r) => r.id === 'hospitalizacion-2026-q4')!)
  assert.ok(closed.questions.every((q) => q.contraste))
  assert.ok(withoutContraste(closed).questions.every((q) => !('contraste' in q)))
  const field = { ...DEMO_READINGS.find((r) => r.id === 'hospitalizacion-2026-q4')!, status: 'field' as const }
  assert.equal(toClientReading(field).questions.length, 0)
  assert.ok(!JSON.stringify(toClientReading(field)).includes('aiYes'))
})
