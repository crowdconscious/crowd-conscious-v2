import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  parseSimAutoplayParam,
  shouldSimAutoplay,
} from './autoplay.ts'

test('parseSimAutoplayParam accepts 1/true/yes only', () => {
  assert.equal(parseSimAutoplayParam('1'), true)
  assert.equal(parseSimAutoplayParam('true'), true)
  assert.equal(parseSimAutoplayParam('YES'), true)
  assert.equal(parseSimAutoplayParam('0'), false)
  assert.equal(parseSimAutoplayParam('false'), false)
  assert.equal(parseSimAutoplayParam(''), false)
  assert.equal(parseSimAutoplayParam(null), false)
  assert.equal(parseSimAutoplayParam(undefined), false)
})

test('shouldSimAutoplay defaults off; captura or autoplay=1 opts in', () => {
  assert.equal(
    shouldSimAutoplay({
      autoplayParam: false,
      captureMode: false,
      personaSelected: false,
    }),
    false,
  )
  assert.equal(
    shouldSimAutoplay({
      autoplayParam: true,
      captureMode: false,
      personaSelected: false,
    }),
    true,
  )
  assert.equal(
    shouldSimAutoplay({
      autoplayParam: false,
      captureMode: true,
      personaSelected: false,
    }),
    true,
  )
  assert.equal(
    shouldSimAutoplay({
      autoplayParam: true,
      captureMode: true,
      personaSelected: true,
    }),
    false,
  )
})
