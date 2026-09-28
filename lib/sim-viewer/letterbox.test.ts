import test from 'node:test'
import assert from 'node:assert/strict'
import { aspectValue, fitLetterbox, CAPTURE_PRESETS } from './letterbox.ts'

test('CAPTURE_PRESETS match Task 6 pixel targets', () => {
  assert.deepEqual(CAPTURE_PRESETS['16:9'], {
    width: 1920,
    height: 1080,
    label: CAPTURE_PRESETS['16:9'].label,
  })
  assert.equal(CAPTURE_PRESETS['9:16'].width, 1080)
  assert.equal(CAPTURE_PRESETS['9:16'].height, 1920)
  assert.equal(CAPTURE_PRESETS['1:1'].width, 1080)
  assert.equal(CAPTURE_PRESETS['1:1'].height, 1080)
})

test('fitLetterbox: 1920×1080 viewport → exact 16:9 stage', () => {
  const s = fitLetterbox(1920, 1080, '16:9')
  assert.equal(s.width, 1920)
  assert.equal(s.height, 1080)
})

test('fitLetterbox: 1080×1920 viewport → exact 9:16 stage', () => {
  const s = fitLetterbox(1080, 1920, '9:16')
  assert.equal(s.width, 1080)
  assert.equal(s.height, 1920)
})

test('fitLetterbox: square viewport letterboxes 16:9', () => {
  const s = fitLetterbox(1080, 1080, '16:9')
  assert.equal(s.width, 1080)
  assert.equal(s.height, 607) // floor(1080 * 9/16)
})

test('fitLetterbox: wide viewport letterboxes 9:16', () => {
  const s = fitLetterbox(1920, 1080, '9:16')
  // height-constrained: height=1080, width=floor(1080 * 9/16)=607
  assert.equal(s.height, 1080)
  assert.equal(s.width, 607)
})

test('aspectValue is width/height', () => {
  assert.ok(Math.abs(aspectValue('16:9') - 16 / 9) < 1e-9)
  assert.ok(Math.abs(aspectValue('9:16') - 9 / 16) < 1e-9)
  assert.equal(aspectValue('1:1'), 1)
})
