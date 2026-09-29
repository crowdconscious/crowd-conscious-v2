import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  deterministicMapOffset,
  jitteredMapPoint,
  mapDotSeed,
  MAP_JITTER_HALF_DEG,
} from './map-jitter.ts'

test('deterministicMapOffset is stable for the same seed', () => {
  const a = deterministicMapOffset('run-a:persona-1:0')
  const b = deterministicMapOffset('run-a:persona-1:0')
  assert.deepEqual(a, b)
})

test('deterministicMapOffset differs across seeds', () => {
  const a = deterministicMapOffset('run-a:persona-1:0')
  const b = deterministicMapOffset('run-a:persona-2:0')
  assert.notDeepEqual(a, b)
})

test('jitter stays within the configured half-extent', () => {
  for (let i = 0; i < 40; i++) {
    const o = deterministicMapOffset(`probe-${i}`)
    assert.ok(Math.abs(o.dLat) <= MAP_JITTER_HALF_DEG + 1e-12)
    assert.ok(Math.abs(o.dLng) <= MAP_JITTER_HALF_DEG + 1e-12)
  }
})

test('jitteredMapPoint adds the offset to the centroid', () => {
  const seed = mapDotSeed('run-1', 'mh-c-001', 3)
  const { dLat, dLng } = deterministicMapOffset(seed)
  const pt = jitteredMapPoint(seed, 19.43, -99.15)
  assert.ok(Math.abs(pt.lat - (19.43 + dLat)) < 1e-12)
  assert.ok(Math.abs(pt.lng - (-99.15 + dLng)) < 1e-12)
})
