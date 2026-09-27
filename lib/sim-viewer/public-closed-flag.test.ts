import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isSimViewerPublicClosedEnabled } from './public-closed-flag.ts'

test('isSimViewerPublicClosedEnabled defaults to true when unset', () => {
  const prev = process.env.SIM_VIEWER_PUBLIC_CLOSED
  delete process.env.SIM_VIEWER_PUBLIC_CLOSED
  assert.equal(isSimViewerPublicClosedEnabled(), true)
  if (prev === undefined) delete process.env.SIM_VIEWER_PUBLIC_CLOSED
  else process.env.SIM_VIEWER_PUBLIC_CLOSED = prev
})

test('isSimViewerPublicClosedEnabled defaults to true when empty string', () => {
  const prev = process.env.SIM_VIEWER_PUBLIC_CLOSED
  process.env.SIM_VIEWER_PUBLIC_CLOSED = ''
  assert.equal(isSimViewerPublicClosedEnabled(), true)
  if (prev === undefined) delete process.env.SIM_VIEWER_PUBLIC_CLOSED
  else process.env.SIM_VIEWER_PUBLIC_CLOSED = prev
})

test('isSimViewerPublicClosedEnabled is false only for the string "false"', () => {
  const prev = process.env.SIM_VIEWER_PUBLIC_CLOSED
  process.env.SIM_VIEWER_PUBLIC_CLOSED = 'false'
  assert.equal(isSimViewerPublicClosedEnabled(), false)
  process.env.SIM_VIEWER_PUBLIC_CLOSED = 'true'
  assert.equal(isSimViewerPublicClosedEnabled(), true)
  process.env.SIM_VIEWER_PUBLIC_CLOSED = 'FALSE'
  // Strict: only lowercase 'false' turns it off (matches flag style elsewhere).
  assert.equal(isSimViewerPublicClosedEnabled(), true)
  process.env.SIM_VIEWER_PUBLIC_CLOSED = '0'
  assert.equal(isSimViewerPublicClosedEnabled(), true)
  if (prev === undefined) delete process.env.SIM_VIEWER_PUBLIC_CLOSED
  else process.env.SIM_VIEWER_PUBLIC_CLOSED = prev
})
