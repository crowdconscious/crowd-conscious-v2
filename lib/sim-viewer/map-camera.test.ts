import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  detailViewBoxFromPoints,
  easeInOutCubic,
  interpolateViewBox,
  overviewViewBox,
  userSpaceDotRadius,
  viewBoxToString,
} from './map-camera.ts'

test('easeInOutCubic is 0 at start and 1 at end', () => {
  assert.equal(easeInOutCubic(0), 0)
  assert.equal(easeInOutCubic(1), 1)
  assert.ok(easeInOutCubic(0.5) > 0.4 && easeInOutCubic(0.5) < 0.6)
})

test('interpolateViewBox lerps with easing', () => {
  const from = overviewViewBox(100, 200)
  const to = { x: 10, y: 20, width: 40, height: 80 }
  const mid = interpolateViewBox(from, to, 0.5)
  assert.ok(mid.width < from.width && mid.width > to.width)
  assert.equal(viewBoxToString(overviewViewBox(10, 20)), '0 0 10 20')
})

test('detailViewBoxFromPoints preserves aspect and pads', () => {
  const vb = detailViewBoxFromPoints(
    [
      [100, 100],
      [200, 100],
      [200, 150],
      [100, 150],
    ],
    400,
    800,
    20,
  )
  assert.ok(Math.abs(vb.width / vb.height - 0.5) < 0.001)
  assert.ok(vb.width > 100)
  assert.ok(vb.x < 100)
})

test('userSpaceDotRadius accounts for meet scaling', () => {
  const overview = overviewViewBox(400, 800)
  const detail = { x: 100, y: 200, width: 100, height: 200 }
  const rOverview = userSpaceDotRadius(6, overview, 400, 800)
  const rDetail = userSpaceDotRadius(6, detail, 400, 800)
  assert.equal(rOverview, 3)
  // Zoomed-in viewBox → larger on-screen scale → smaller user-space radius
  // for the same on-screen diameter.
  assert.ok(rDetail < rOverview)
  assert.equal(rDetail, 0.75)
})
