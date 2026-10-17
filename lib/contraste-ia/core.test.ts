import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePanelVote, summarizeRun, aggregateRuns, compare, gapHeadline, subjectHash, splitPanels } from './core.ts'

const opts = ['A', 'B', 'C']
test('parse single + multi + reject', () => {
  assert.deepEqual(parsePanelVote('{"option":"A","confidence":7,"reasoning_es":"x"}', opts, 1), { options: ['A'], confidence: 7 })
  assert.deepEqual(parsePanelVote('```json\n{"options":["A","C"],"confidence":3}\n```', opts, 3), { options: ['A', 'C'], confidence: 3 })
  assert.equal(parsePanelVote('{"options":["A","B","C"],"confidence":3}', opts, 2), null)
  assert.equal(parsePanelVote('{"option":"Z","confidence":3}', opts, 1), null)
  assert.equal(parsePanelVote('{"option":"A","confidence":0}', opts, 1), null)
})
test('summarize + aggregate', () => {
  const s = summarizeRun([{ options: ['A'], confidence: 10 }, { options: ['B'], confidence: 5 }], opts)
  assert.equal(s.option_distribution.A, 0.5)
  assert.equal(s.confidence_distribution['10'], 1)
  const r = (a: number) => ({ run: 1, option_distribution: { A: a, B: 1 - a, C: 0 }, confidence_distribution: { '5': 2 }, valid: 2, attempted: 2, input_tokens: 0, output_tokens: 0 })
  const agg = aggregateRuns([r(0.4), r(0.6)], opts)
  assert.equal(agg.option_distribution.A, 0.5)
  assert.ok(agg.option_spread.A > 0.14 && agg.option_spread.A < 0.15)
  assert.equal(agg.confidence_distribution['5'], 4)
  assert.equal(agg.avg_confidence, 5)
})
test('compare + headline', () => {
  const c = compare(opts, { A: 0.6, B: 0.3, C: 0.1 }, { A: 0.3, B: 0.6, C: 0.1 })
  assert.equal(c.biggest?.gap, -30)
  assert.match(gapHeadline(c), /esperaba que ganara «A».*eligió «B»/)
})
test('hash stable + panels disjoint', () => {
  const s = { question: 'q', description: null, options: opts, voteMode: 'single' as const, maxSelections: 3 }
  assert.equal(subjectHash(s), subjectHash({ ...s, maxSelections: 5 }))
  assert.notEqual(subjectHash(s), subjectHash({ ...s, question: 'q2' }))
  const p = splitPanels([1, 2, 3, 4, 5, 6, 7], 3, 2)
  assert.deepEqual(p, [[1, 4], [2, 5], [3, 6]])
})
