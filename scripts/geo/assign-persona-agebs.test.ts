/**
 * Tests for Task 4a.2 — deterministic AGEB pick + inside-polygon jitter.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assignPersona,
  geometriesIntersect,
  jitterInsidePolygon,
  matchOfficialColonias,
  normalizeColoniaName,
  pickWeightedDeterministic,
  pointInGeometry,
  type AgebFeature,
  type ColoniaFeature,
  type Geom,
  type PopRow,
} from './persona-ageb-lib.ts'

const ROOT = process.cwd()

function loadAgebs(): AgebFeature[] {
  const fc = JSON.parse(
    readFileSync(join(ROOT, 'public/geo/ageb-cuauhtemoc-mh.geojson'), 'utf8')
  ) as { features: AgebFeature[] }
  return fc.features
}

function loadColonias(): ColoniaFeature[] {
  const fc = JSON.parse(
    readFileSync(join(ROOT, 'public/geo/colonias-cuau-mh.geojson'), 'utf8')
  ) as { features: ColoniaFeature[] }
  return fc.features
}

function loadPop(): Record<string, PopRow> {
  return JSON.parse(
    readFileSync(join(ROOT, 'public/geo/ageb-population-cuau-mh.json'), 'utf8')
  ) as Record<string, PopRow>
}

test('normalizeColoniaName strips accents and Col. prefix', () => {
  assert.equal(normalizeColoniaName('Santa María la Ribera'), 'santa maria la ribera')
  assert.equal(normalizeColoniaName('Col. Doctores'), 'doctores')
  assert.equal(normalizeColoniaName('Ampliación Granada'), 'ampliacion granada')
  assert.equal(normalizeColoniaName('Polanco V Sección'), 'polanco v seccion')
})

test('matchOfficialColonias expands Polanco sections; does not fuzzy-match Condesa→Hipódromo', () => {
  const colonias = loadColonias()
  const polanco = matchOfficialColonias('Polanco', 'Miguel Hidalgo', colonias)
  assert.equal(polanco.length, 5)
  assert.ok(polanco.every((c) => c.properties.colonia.startsWith('Polanco')))

  const condesa = matchOfficialColonias('Condesa', 'Cuauhtémoc', colonias)
  assert.equal(condesa.length, 1)
  assert.equal(condesa[0]!.properties.colonia, 'Condesa')

  const bogus = matchOfficialColonias('Colonia Inventada XYZ', 'Cuauhtémoc', colonias)
  assert.equal(bogus.length, 0)
})

test('Popo matches only exact Popo — never Popotla or Ampliacion Popo', () => {
  const colonias = loadColonias()
  const popo = matchOfficialColonias('Popo', 'Miguel Hidalgo', colonias)
  assert.equal(popo.length, 1)
  assert.equal(popo[0]!.properties.colonia, 'Popo')
  assert.ok(!popo.some((c) => /popotla|ampliacion/i.test(c.properties.colonia)))

  const popotla = matchOfficialColonias('Popotla', 'Miguel Hidalgo', colonias)
  assert.equal(popotla.length, 1)
  assert.equal(popotla[0]!.properties.colonia, 'Popotla')
})

test('pickWeightedDeterministic is stable for the same persona id', () => {
  const candidates = [
    { code: 'A', weight: 10 },
    { code: 'B', weight: 20 },
    { code: 'C', weight: 70 },
  ]
  const id = '11111111-1111-4111-8111-111111111111'
  const a = pickWeightedDeterministic(id, candidates)
  const b = pickWeightedDeterministic(id, candidates)
  assert.equal(a, b)
  // Different id should be allowed to differ (not required, but usually does)
  const other = pickWeightedDeterministic(
    '22222222-2222-4222-8222-222222222222',
    candidates
  )
  // At least one of many ids diverges — sample a few
  const picks = new Set(
    [
      id,
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      '55555555-5555-4555-8555-555555555555',
    ].map((x) => pickWeightedDeterministic(x, candidates))
  )
  assert.ok(picks.size >= 2, `expected diversity, got ${[...picks]}`)
  void other
})

test('pickWeightedDeterministic respects heavy weights (probabilistic sanity)', () => {
  const candidates = [
    { code: 'HEAVY', weight: 1_000_000 },
    { code: 'LIGHT', weight: 1 },
  ]
  let heavy = 0
  for (let i = 0; i < 40; i++) {
    const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
    if (pickWeightedDeterministic(id, candidates) === 'HEAVY') heavy++
  }
  assert.ok(heavy >= 35, `expected HEAVY almost always, got ${heavy}/40`)
})

test('jitterInsidePolygon stays inside and is deterministic', () => {
  const agebs = loadAgebs()
  const feat = agebs[0]!
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  const a = jitterInsidePolygon(
    id,
    feat.geometry,
    feat.properties.centroid_lat,
    feat.properties.centroid_lng
  )
  const b = jitterInsidePolygon(
    id,
    feat.geometry,
    feat.properties.centroid_lat,
    feat.properties.centroid_lng
  )
  assert.deepEqual(a, b)
  assert.ok(
    pointInGeometry(a.lng, a.lat, feat.geometry),
    'jittered point must be inside AGEB polygon'
  )
})

test('jitter retries stay inside for many personas on same AGEB', () => {
  const agebs = loadAgebs()
  const feat = agebs.find((f) => f.properties.alcaldia === 'Cuauhtémoc')!
  const points = new Set<string>()
  for (let i = 0; i < 30; i++) {
    const id = `bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12, '0')}`
    const p = jitterInsidePolygon(
      id,
      feat.geometry,
      feat.properties.centroid_lat,
      feat.properties.centroid_lng
    )
    assert.ok(pointInGeometry(p.lng, p.lat, feat.geometry))
    points.add(`${p.lat},${p.lng}`)
  }
  // Personas sharing an AGEB should not all collapse to the exact same point.
  assert.ok(points.size > 1)
})

test('assignPersona is deterministic and codes exist in GeoJSON', () => {
  const agebs = loadAgebs()
  const colonias = loadColonias()
  const population = loadPop()
  const codes = new Set(agebs.map((a) => a.properties.ageb_code))

  const persona = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    alcaldia: 'Cuauhtémoc',
    colonia: 'Roma Norte',
    income_band: 'C+',
  }
  const a = assignPersona({ persona, agebs, colonias, population })
  const b = assignPersona({ persona, agebs, colonias, population })
  assert.deepEqual(a, b)
  assert.equal(a.method, 'colonia_census_weighted')
  assert.ok(a.ageb_code && codes.has(a.ageb_code))
  assert.ok(a.centroid_lat != null && a.centroid_lng != null)
  const feat = agebs.find((f) => f.properties.ageb_code === a.ageb_code)!
  assert.ok(pointInGeometry(a.centroid_lng!, a.centroid_lat!, feat.geometry))
})

test('assignPersona falls back for unmatched colonia names (no guessing)', () => {
  const agebs = loadAgebs()
  const colonias = loadColonias()
  const population = loadPop()
  const a = assignPersona({
    persona: {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      alcaldia: 'Miguel Hidalgo',
      colonia: 'Nombre Que No Existe En Catalogo',
    },
    agebs,
    colonias,
    population,
  })
  assert.equal(a.method, 'alcaldia_fallback')
  assert.ok(a.ageb_code)
  assert.equal(a.official_colonia_names.length, 0)
})

test('assignPersona leaves out-of-scope alcaldías unassigned', () => {
  const agebs = loadAgebs()
  const colonias = loadColonias()
  const population = loadPop()
  const a = assignPersona({
    persona: {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      alcaldia: 'Coyoacán',
      colonia: 'Del Carmen',
    },
    agebs,
    colonias,
    population,
  })
  assert.equal(a.method, 'unassigned_outside_scope')
  assert.equal(a.ageb_code, null)
})

test('Condesa colonia intersects real AGEBs (geometry sanity)', () => {
  const agebs = loadAgebs()
  const colonias = loadColonias()
  const matched = matchOfficialColonias('Condesa', 'Cuauhtémoc', colonias)
  assert.equal(matched.length, 1)
  let hits = 0
  for (const ageb of agebs.filter((a) => a.properties.alcaldia === 'Cuauhtémoc')) {
    if (geometriesIntersect(matched[0]!.geometry, ageb.geometry)) hits++
  }
  assert.ok(hits >= 1, `expected Condesa to intersect ≥1 AGEB, got ${hits}`)
})

test('square PIP helper smoke', () => {
  const square: Geom = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  }
  assert.equal(pointInGeometry(0.5, 0.5, square), true)
  assert.equal(pointInGeometry(1.5, 0.5, square), false)
})
