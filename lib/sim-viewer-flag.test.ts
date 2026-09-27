import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isSimViewerEnabled } from './sim-viewer-flag.ts'

test('isSimViewerEnabled defaults to false when unset', () => {
  const prev = process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED
  delete process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED
  assert.equal(isSimViewerEnabled(), false)
  if (prev === undefined) delete process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED
  else process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED = prev
})

test('isSimViewerEnabled is true only for the string "true"', () => {
  const prev = process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED
  process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED = 'true'
  assert.equal(isSimViewerEnabled(), true)
  process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED = '1'
  assert.equal(isSimViewerEnabled(), false)
  process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED = 'TRUE'
  assert.equal(isSimViewerEnabled(), false)
  if (prev === undefined) delete process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED
  else process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED = prev
})
