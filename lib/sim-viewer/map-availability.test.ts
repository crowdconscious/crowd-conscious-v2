import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import type { AgebFeatureCollection } from './ageb-geo.ts'
import { buildAgebCodeSet } from './ageb-geo.ts'
import {
  evaluateMapAvailability,
  isPersonaMappable,
  MAP_AVAILABILITY_THRESHOLD,
} from './map-availability.ts'

const GEO = JSON.parse(
  readFileSync(join(process.cwd(), 'public/geo/ageb-cuauhtemoc-mh.geojson'), 'utf8'),
) as AgebFeatureCollection

const CODES = buildAgebCodeSet(GEO.features)
const SAMPLE = GEO.features[0]!.properties

test('MAP_AVAILABILITY_THRESHOLD is 90%', () => {
  assert.equal(MAP_AVAILABILITY_THRESHOLD, 0.9)
})

test('isPersonaMappable requires code in GeoJSON + finite centroids', () => {
  assert.equal(
    isPersonaMappable(
      {
        agebCode: SAMPLE.ageb_code,
        centroidLat: SAMPLE.centroid_lat,
        centroidLng: SAMPLE.centroid_lng,
      },
      CODES,
    ),
    true,
  )
  assert.equal(
    isPersonaMappable(
      {
        agebCode: 'FIX-NOT-REAL',
        centroidLat: SAMPLE.centroid_lat,
        centroidLng: SAMPLE.centroid_lng,
      },
      CODES,
    ),
    false,
  )
  assert.equal(
    isPersonaMappable(
      {
        agebCode: SAMPLE.ageb_code,
        centroidLat: null,
        centroidLng: SAMPLE.centroid_lng,
      },
      CODES,
    ),
    false,
  )
})

test('evaluateMapAvailability hides toggle below 90%', () => {
  const good = {
    agebCode: SAMPLE.ageb_code,
    centroidLat: SAMPLE.centroid_lat,
    centroidLng: SAMPLE.centroid_lng,
  }
  const bad = {
    agebCode: null,
    centroidLat: null,
    centroidLng: null,
  }

  // 9/10 = 90% → available
  const atThreshold = evaluateMapAvailability(
    [...Array.from({ length: 9 }, () => good), bad],
    CODES,
  )
  assert.equal(atThreshold.mappable, 9)
  assert.equal(atThreshold.missingLocation, 1)
  assert.equal(atThreshold.available, true)

  // 8/10 = 80% → hidden
  const below = evaluateMapAvailability(
    [...Array.from({ length: 8 }, () => good), bad, bad],
    CODES,
  )
  assert.equal(below.available, false)
  assert.equal(below.ratio, 0.8)
})

test('empty persona list is not available', () => {
  const empty = evaluateMapAvailability([], CODES)
  assert.equal(empty.available, false)
  assert.equal(empty.total, 0)
})
