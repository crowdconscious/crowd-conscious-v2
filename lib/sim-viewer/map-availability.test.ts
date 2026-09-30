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
import { resolvePersonaMapLocation } from './persona-map-location.ts'

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

test('evaluateMapAvailability uses colonia/alcaldía fallback when AGEB missing', () => {
  const withAgeb = {
    agebCode: SAMPLE.ageb_code,
    centroidLat: SAMPLE.centroid_lat,
    centroidLng: SAMPLE.centroid_lng,
    colonia: 'Roma Norte',
    alcaldia: 'Cuauhtémoc',
  }
  const coloniaOnly = {
    agebCode: null,
    centroidLat: null,
    centroidLng: null,
    colonia: 'Doctores',
    alcaldia: 'Cuauhtémoc',
  }
  const alcaldiaOnly = {
    agebCode: null,
    centroidLat: null,
    centroidLng: null,
    colonia: null,
    alcaldia: 'Miguel Hidalgo',
  }
  const unplaceable = {
    agebCode: null,
    centroidLat: null,
    centroidLng: null,
    colonia: null,
    alcaldia: 'Iztapalapa',
  }

  // 9/10 placeable via mix of AGEB + colonia + alcaldía → available
  const atThreshold = evaluateMapAvailability(
    [
      ...Array.from({ length: 7 }, () => withAgeb),
      coloniaOnly,
      alcaldiaOnly,
      unplaceable,
    ],
    CODES,
  )
  assert.equal(atThreshold.mappable, 9)
  assert.equal(atThreshold.missingLocation, 1)
  assert.equal(atThreshold.available, true)
  assert.equal(atThreshold.pending, false)

  // All colonia-only (no AGEB SQL applied) still available
  const fallbackOnly = evaluateMapAvailability(
    Array.from({ length: 10 }, () => coloniaOnly),
    CODES,
  )
  assert.equal(fallbackOnly.available, true)
  assert.equal(fallbackOnly.mappable, 10)
})

test('empty persona list is pending (not available)', () => {
  const empty = evaluateMapAvailability([], CODES)
  assert.equal(empty.available, false)
  assert.equal(empty.pending, true)
  assert.equal(empty.total, 0)
})

test('resolvePersonaMapLocation prefers AGEB then colonia then alcaldía', () => {
  const ageb = resolvePersonaMapLocation(
    {
      agebCode: SAMPLE.ageb_code,
      centroidLat: SAMPLE.centroid_lat,
      centroidLng: SAMPLE.centroid_lng,
      colonia: 'Roma Norte',
      alcaldia: 'Cuauhtémoc',
    },
    CODES,
  )
  assert.equal(ageb?.precision, 'ageb')

  const colonia = resolvePersonaMapLocation(
    {
      agebCode: null,
      centroidLat: null,
      centroidLng: null,
      colonia: 'Polanco',
      alcaldia: 'Miguel Hidalgo',
    },
    CODES,
  )
  assert.equal(colonia?.precision, 'colonia')
  assert.ok(colonia && Number.isFinite(colonia.lat))

  const alcaldia = resolvePersonaMapLocation(
    {
      agebCode: null,
      centroidLat: null,
      centroidLng: null,
      colonia: null,
      alcaldia: 'Cuauhtémoc',
    },
    CODES,
  )
  assert.equal(alcaldia?.precision, 'alcaldia')
})
