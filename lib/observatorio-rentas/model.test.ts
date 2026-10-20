import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { allowedMax, classifyRisk, isWatch, alcaldiaAggregates, expandCore, stableStates, computeWatchCutoff, type SeedCore } from './model.ts'

test('risk classification follows the brief thresholds', () => {
  assert.equal(classifyRisk(10, 1, 1), 'nodata')
  assert.equal(classifyRisk(30, 2.9, 10), 'within')
  assert.equal(classifyRisk(30, 3.2, 10), 'near')
  assert.equal(classifyRisk(30, 2.0, 20), 'near')
  assert.equal(classifyRisk(30, 3.8, 10), 'above')
  assert.equal(classifyRisk(30, 2.0, 31), 'above')
})
test('watch signal', () => {
  assert.equal(isWatch(14.2, 0, 14), true)
  assert.equal(isWatch(9, 3.1, 14), true)
  assert.equal(isWatch(13.9, 2.9, 14), false)
  // cutoff never drops below 3× inflation
  assert.equal(computeWatchCutoff([1, 2, 3, 4]), 10.8)
})
test('calculator cap', () => {
  assert.equal(allowedMax(10000), 10369)
})
test('seed is complete and aggregates cover 16 alcaldías', () => {
  const seed = expandCore(JSON.parse(readFileSync('public/observatorio-rentas/data/core.json', 'utf8')) as SeedCore)
  assert.equal(seed.alcaldias.length, 16)
  const a = alcaldiaAggregates(seed)
  assert.equal(a.length, 16)
  const thin = seed.colonias.filter((c) => c.renewal_reports_n < 25).length / seed.colonias.length
  assert.ok(thin > 0.5 && thin < 0.9) // Phase-1 scale: most colonias below n=25
  const mc = seed.colonias.filter((c) => c.cvegeo === '09008')
  assert.equal(mc.length, 42)
  assert.ok(mc.every((c) => c.has_polygon))
  assert.ok(mc.some((c) => c.renewal_reports_n < 25))
})

test('strict «A vigilar» rule leaves 15–25 colonias with the seed', () => {
  const seed = expandCore(JSON.parse(readFileSync('public/observatorio-rentas/data/core.json', 'utf8')) as SeedCore)
  const n = seed.colonias.filter((c) => isWatch(c.asking_change_12m, c.asking_change_4w)).length
  assert.ok(n >= 15 && n <= 25, `watch count ${n}`)
})

test('seed total renewal reports is Phase-1 scale (2,000–3,000)', () => {
  const seed = expandCore(JSON.parse(readFileSync('public/observatorio-rentas/data/core.json', 'utf8')) as SeedCore)
  const total = seed.colonias.reduce((a, c) => a + c.renewal_reports_n, 0)
  assert.ok(total >= 2000 && total <= 3000, `total ${total}`)
})

test('alert hysteresis: one-week flip does not change state, two weeks does', () => {
  const raw = (pcts: number[]) => pcts.map((p) => classifyRisk(40, 2.0, p))
  // 29 → 30.5 → 29.8: a single week above 30% stays «near»
  assert.deepEqual(stableStates(raw([29, 30.5, 29.8, 29.5])).at(-1), 'near')
  // two consecutive weeks above 30% switch to «above»
  assert.deepEqual(stableStates(raw([29, 31, 31.2])).at(-1), 'above')
  assert.deepEqual(stableStates(raw([29, 31, 29, 31])).at(-1), 'near')
})
