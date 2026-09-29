/**
 * Tests for Task 4a.2 — deterministic AGEB pick, sliver exclusion, intersection jitter.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assignPersona,
  isSliverIntersection,
  intersectionPopulationWeight,
  jitterInsidePolygon,
  matchOfficialColonias,
  normalizeColoniaName,
  pickWeightedDeterministic,
  pointInGeometry,
  type AgebFeature,
  type ColoniaCandidateIndex,
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

function loadCandidateIndex(): ColoniaCandidateIndex {
  return JSON.parse(
    readFileSync(join(ROOT, 'public/geo/colonia-ageb-candidates.json'), 'utf8')
  ) as ColoniaCandidateIndex
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

test('isSliverIntersection drops only when BOTH fractions are below threshold', () => {
  assert.equal(isSliverIntersection(0.05, 0.05), true)
  assert.equal(isSliverIntersection(0.05, 0.15), false) // small AGEB fully covering colonia fragment
  assert.equal(isSliverIntersection(0.25, 0.03), false) // substantial AGEB share inside colonia
  assert.equal(isSliverIntersection(0.99, 0.01), false)
  assert.equal(isSliverIntersection(0.09, 0.09), true)
  assert.equal(isSliverIntersection(0.1, 0.1), false)
})

test('Doctores / Roma Norte sliver AGEBs from review are excluded', () => {
  const idx = loadCandidateIndex()
  const doctores = idx.entries['Cuauhtémoc||Doctores']
  assert.ok(doctores)
  assert.ok(doctores!.candidates_before > doctores!.candidates_after)
  const docKept = new Set(doctores!.candidates.map((c) => c.ageb_code))
  // Review: east-of-Eje-Central / Juárez / west-of-Cuauhtémoc slivers for Doctores
  assert.ok(!docKept.has('0901500010964'), '0964 should be dropped from Doctores')
  assert.ok(!docKept.has('0901500011017'), '1017 (Roma Norte) should be dropped from Doctores')
  assert.ok(!docKept.has('0901500010856'), '0856 (Juárez) should be dropped from Doctores')

  const roma = idx.entries['Cuauhtémoc||Roma Norte']
  assert.ok(roma)
  const romaKept = new Set(roma!.candidates.map((c) => c.ageb_code))
  assert.ok(!romaKept.has('0901500010856'), '0856 (Juárez) should be dropped from Roma Norte')
  // 1017 is legitimately Roma Norte territory — may remain
  assert.ok(
    doctores!.candidates_after <= 12,
    `Doctores after-sliver count too high: ${doctores!.candidates_after}`
  )
  assert.ok(
    roma!.candidates_after <= 15,
    `Roma Norte after-sliver count too high: ${roma!.candidates_after}`
  )
})

test('intersectionPopulationWeight scales by frac_of_ageb', () => {
  const { weight, source } = intersectionPopulationWeight(
    { POBTOT: 1000, P_18YMAS: 800 },
    0.25
  )
  assert.equal(source, 'P_18YMAS')
  assert.equal(weight, 200)
})

test('pickWeightedDeterministic is stable for the same persona id', () => {
  const candidates = [
    { code: 'A', weight: 10 },
    { code: 'B', weight: 20 },
    { code: 'C', weight: 70 },
  ]
  const id = '11111111-1111-4111-8111-111111111111'
  assert.equal(
    pickWeightedDeterministic(id, candidates),
    pickWeightedDeterministic(id, candidates)
  )
  const picks = new Set(
    [
      id,
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      '55555555-5555-4555-8555-555555555555',
    ].map((x) => pickWeightedDeterministic(x, candidates))
  )
  assert.ok(picks.size >= 2)
})

test('jitterInsidePolygon stays inside intersection and is deterministic', () => {
  const idx = loadCandidateIndex()
  const cand = idx.entries['Cuauhtémoc||Doctores']!.candidates[0]!
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  const a = jitterInsidePolygon(
    id,
    cand.intersection,
    cand.point_on_surface.lat,
    cand.point_on_surface.lng
  )
  const b = jitterInsidePolygon(
    id,
    cand.intersection,
    cand.point_on_surface.lat,
    cand.point_on_surface.lng
  )
  assert.deepEqual(a, b)
  assert.ok(pointInGeometry(a.lng, a.lat, cand.intersection))
})

test('assignPersona places point inside colonia∩AGEB and is deterministic', () => {
  const agebs = loadAgebs()
  const colonias = loadColonias()
  const population = loadPop()
  const candidateIndex = loadCandidateIndex()
  const codes = new Set(agebs.map((a) => a.properties.ageb_code))

  const persona = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    alcaldia: 'Cuauhtémoc',
    colonia: 'Roma Norte',
    income_band: 'C+',
  }
  const a = assignPersona({
    persona,
    agebs,
    colonias,
    population,
    candidateIndex,
  })
  const b = assignPersona({
    persona,
    agebs,
    colonias,
    population,
    candidateIndex,
  })
  assert.deepEqual(a, b)
  assert.equal(a.method, 'colonia_census_weighted')
  assert.ok(a.ageb_code && codes.has(a.ageb_code))
  assert.ok(a.candidates_before != null && a.candidates_before > a.candidate_count)

  const entry = candidateIndex.entries['Cuauhtémoc||Roma Norte']!
  const cand = entry.candidates.find((c) => c.ageb_code === a.ageb_code)!
  assert.ok(pointInGeometry(a.centroid_lng!, a.centroid_lat!, cand.intersection))

  // Also inside the AGEB polygon and at least one matched official colonia.
  const agebFeat = agebs.find((f) => f.properties.ageb_code === a.ageb_code)!
  assert.ok(pointInGeometry(a.centroid_lng!, a.centroid_lat!, agebFeat.geometry))
  const matched = matchOfficialColonias('Roma Norte', 'Cuauhtémoc', colonias)
  assert.ok(
    matched.some((m) =>
      pointInGeometry(a.centroid_lng!, a.centroid_lat!, m.geometry)
    )
  )
})

test('assignPersona falls back for unmatched colonia names (no guessing)', () => {
  const agebs = loadAgebs()
  const colonias = loadColonias()
  const population = loadPop()
  const candidateIndex = loadCandidateIndex()
  const a = assignPersona({
    persona: {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      alcaldia: 'Miguel Hidalgo',
      colonia: 'Nombre Que No Existe En Catalogo',
    },
    agebs,
    colonias,
    population,
    candidateIndex,
  })
  assert.equal(a.method, 'alcaldia_fallback')
  assert.ok(a.ageb_code)
})

test('assignPersona leaves out-of-scope alcaldías unassigned', () => {
  const agebs = loadAgebs()
  const colonias = loadColonias()
  const population = loadPop()
  const candidateIndex = loadCandidateIndex()
  const a = assignPersona({
    persona: {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      alcaldia: 'Coyoacán',
      colonia: 'Del Carmen',
    },
    agebs,
    colonias,
    population,
    candidateIndex,
  })
  assert.equal(a.method, 'unassigned_outside_scope')
  assert.equal(a.ageb_code, null)
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
