import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isSimViewerPublicClosedEnabled } from './public-closed-flag.ts'

test('isSimViewerPublicClosedEnabled defaults to false when unset', () => {
  const prev = process.env.SIM_VIEWER_PUBLIC_CLOSED
  delete process.env.SIM_VIEWER_PUBLIC_CLOSED
  assert.equal(isSimViewerPublicClosedEnabled(), false)
  if (prev === undefined) delete process.env.SIM_VIEWER_PUBLIC_CLOSED
  else process.env.SIM_VIEWER_PUBLIC_CLOSED = prev
})

test('isSimViewerPublicClosedEnabled is true only for the string "true"', () => {
  const prev = process.env.SIM_VIEWER_PUBLIC_CLOSED
  process.env.SIM_VIEWER_PUBLIC_CLOSED = 'true'
  assert.equal(isSimViewerPublicClosedEnabled(), true)
  process.env.SIM_VIEWER_PUBLIC_CLOSED = '1'
  assert.equal(isSimViewerPublicClosedEnabled(), false)
  process.env.SIM_VIEWER_PUBLIC_CLOSED = 'TRUE'
  assert.equal(isSimViewerPublicClosedEnabled(), false)
  process.env.SIM_VIEWER_PUBLIC_CLOSED = 'false'
  assert.equal(isSimViewerPublicClosedEnabled(), false)
  if (prev === undefined) delete process.env.SIM_VIEWER_PUBLIC_CLOSED
  else process.env.SIM_VIEWER_PUBLIC_CLOSED = prev
})
