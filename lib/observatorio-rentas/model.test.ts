import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { allowedMax, classifyRisk, isWatch, alcaldiaAggregates, type Seed } from './model.ts'

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
  const seed = JSON.parse(readFileSync('public/observatorio-rentas/seed.json', 'utf8')) as Seed
  assert.equal(seed.alcaldias.length, 16)
  const a = alcaldiaAggregates(seed)
  assert.equal(a.length, 16)
  const thin = seed.colonias.filter((c) => c.renewal_reports_n < 25).length / seed.colonias.length
  assert.ok(thin > 0.12 && thin < 0.28)
})
