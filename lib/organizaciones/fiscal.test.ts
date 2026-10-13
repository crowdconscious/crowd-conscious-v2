import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidRfcFormat } from './fiscal.ts'
import { PILOT_BREAKDOWN } from './pricing.ts'

test('RFC format', () => {
  assert.equal(isValidRfcFormat('ABC010101AB1'), true)
  assert.equal(isValidRfcFormat('abcd 010101 ab1'), true)
  assert.equal(isValidRfcFormat('ABC011301AB1'), false)
  assert.equal(isValidRfcFormat('AB010101AB1'), false)
})

test('pilot breakdown', () => {
  assert.equal(PILOT_BREAKDOWN.iva, 6240)
  assert.equal(PILOT_BREAKDOWN.total, 45240)
  assert.equal(PILOT_BREAKDOWN.fund, 7800)
})
