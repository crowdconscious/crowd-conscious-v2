import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { allowedMax, classifyRisk, isWatch, alcaldiaAggregates, expandCore, type SeedCore } from './model.ts'

test('risk classification follows the brief thresholds', () => {
  assert.equal(classifyRisk(10, 1, 1), 'nodata')
  assert.equal(classifyRisk(30, 2.9, 10), 'within')
  assert.equal(classifyRisk(30, 3.2, 10), 'near')
  assert.equal(classifyRisk(30, 2.0, 20), 'near')
  assert.equal(classifyRisk(30, 3.8, 10), 'above')
  assert.equal(classifyRisk(30, 2.0, 31), 'above')
})
test('watch signal', () => {
  assert.equal(isWatch(7.3, 0), true)
  assert.equal(isWatch(7.1, 3.1), true)
  assert.equal(isWatch(7.1, 2.9), false)
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
  assert.ok(thin > 0.12 && thin < 0.28)
  const mc = seed.colonias.filter((c) => c.cvegeo === '09008')
  assert.equal(mc.length, 42)
  assert.ok(mc.every((c) => c.has_polygon))
  assert.ok(mc.some((c) => c.renewal_reports_n < 25))
})
