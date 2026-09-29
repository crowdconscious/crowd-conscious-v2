import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ACTIVE_ALCALDIA_CVEGEO,
  isActiveAlcaldia,
  type CdmxAlcaldiaFeatureCollection,
} from './cdmx-alcaldias.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const geoPath = join(root, 'public/geo/cdmx-alcaldias.geojson')

test('cdmx-alcaldias.geojson has 16 official alcaldías with accents', () => {
  const raw = readFileSync(geoPath, 'utf8')
  const geo = JSON.parse(raw) as CdmxAlcaldiaFeatureCollection
  assert.equal(geo.type, 'FeatureCollection')
  assert.equal(geo.features.length, 16)

  const names = geo.features.map((f) => f.properties.nombre).sort()
  assert.ok(names.includes('Cuauhtémoc'))
  assert.ok(names.includes('Miguel Hidalgo'))
  assert.ok(names.includes('Álvaro Obregón'))
  assert.ok(names.includes('Coyoacán'))
  assert.ok(names.includes('Tláhuac'))

  for (const f of geo.features) {
    assert.ok(typeof f.properties.cvegeo === 'string')
    assert.match(f.properties.cvegeo, /^09\d{3}$/)
    assert.ok(f.properties.nombre.length > 0)
    assert.ok(
      f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon',
    )
  }

  assert.equal(ACTIVE_ALCALDIA_CVEGEO.size, 2)
  assert.equal(isActiveAlcaldia('09015'), true)
  assert.equal(isActiveAlcaldia('09016'), true)
  assert.equal(isActiveAlcaldia('09012'), false)
})

test('cdmx-alcaldias.geojson stays under 150 KB', () => {
  const bytes = readFileSync(geoPath).byteLength
  assert.ok(
    bytes < 150 * 1024,
    `expected <150 KB, got ${(bytes / 1024).toFixed(1)} KB`,
  )
})
