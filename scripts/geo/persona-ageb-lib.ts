/**
 * Pure helpers for Task 4a.2 — assign real INEGI AGEBs to simulation personas.
 * No I/O. Deterministic picks + inside-polygon jitter.
 *
 * Candidate selection (sliver-aware) is precomputed in
 * scripts/geo/build-colonia-ageb-intersections.py → colonia-ageb-candidates.json:
 *   - metric intersection areas in EPSG:32614
 *   - drop if intersection < 10% of AGEB area AND < 10% of colonia area
 *   - weight factor = frac_of_ageb (= intersection / AGEB area)
 *   - placement polygon = colonia ∩ AGEB intersection
 */

export type AssignmentMethod = 'colonia_census_weighted' | 'alcaldia_fallback'

export type Ring = number[][]
export type PolygonCoords = Ring[]
export type MultiPolygonCoords = PolygonCoords[]

export type Geom =
  | { type: 'Polygon'; coordinates: PolygonCoords }
  | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords }

export type AgebFeature = {
  properties: {
    ageb_code: string
    cvegeo: string
    alcaldia: string
    centroid_lat: number
    centroid_lng: number
  }
  geometry: Geom
}

export type ColoniaFeature = {
  properties: {
    colonia: string
    alc: string
    cve_alc?: string
    cve_col?: string
  }
  geometry: Geom
}

export type PersonaInput = {
  id: string
  alcaldia: string
  colonia: string | null
  income_band?: string | null
  nse_band?: string | null
  age?: number | null
  gender?: string | null
}

export type PopRow = { POBTOT: number | null; P_18YMAS: number | null }

export type IntersectionCandidate = {
  ageb_code: string
  ageb_area_m2: number
  colonia_area_m2: number
  intersection_area_m2: number
  frac_of_ageb: number
  frac_of_colonia: number
  point_on_surface: { lat: number; lng: number }
  intersection: Geom
}

export type ColoniaCandidateEntry = {
  alcaldia: string
  persona_colonia: string
  official_names: string[]
  candidates_before: number
  candidates_after: number
  dropped_slivers?: string[]
  candidates: IntersectionCandidate[]
}

export type ColoniaCandidateIndex = {
  crs_metric: string
  sliver_threshold: number
  entries: Record<string, ColoniaCandidateEntry>
}

export type Assignment = {
  id: string
  alcaldia: string
  colonia: string | null
  ageb_code: string | null
  centroid_lat: number | null
  centroid_lng: number | null
  method: AssignmentMethod | 'unassigned_outside_scope' | 'unassigned_no_candidates'
  official_colonia_names: string[]
  candidate_count: number
  candidates_before: number | null
  weight_source: 'P_18YMAS' | 'POBTOT' | 'uniform' | null
  frac_of_ageb: number | null
}

const ALLOWED_ALCALDIAS = new Set(['Cuauhtémoc', 'Miguel Hidalgo'])

/** FNV-1a 32-bit → mulberry32 seed. */
export function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export type SeededRng = {
  next: () => number
  nextFloat: (min: number, max: number) => number
}

export function createSeededRng(seed: string | number): SeededRng {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed)
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    nextFloat(min: number, max: number) {
      return min + next() * (max - min)
    },
  }
}

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

/**
 * Normalize colonia names for exact / sectional matching.
 * Handles accents, case, "Col.", "Ampl.", and "Sección" variants.
 * Does NOT invent fuzzy aliases.
 */
export function normalizeColoniaName(raw: string): string {
  let s = stripAccents(raw || '')
    .toLowerCase()
    .trim()
  s = s.replace(/\bcol(?:onia)?\.?\s+/g, ' ')
  s = s.replace(/\bampl\.\s*/g, 'ampliacion ')
  s = s.replace(/ª/g, 'a').replace(/º/g, 'o')
  s = s.replace(/\bseccion\b/g, 'seccion')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

const SECTION_RE =
  /^(.+?)\s+((?:i{1,3}|iv|v|vi{0,3}|ix|x|\d+))\s+seccion$/

export function coloniaBaseAndSection(
  normalized: string
): { base: string; section: string | null } {
  const m = SECTION_RE.exec(normalized)
  if (!m) return { base: normalized, section: null }
  return { base: m[1]!.trim(), section: m[2]! }
}

/**
 * Match a persona colonia string to official colonia features in the same
 * alcaldía.
 *
 * Rules (never fuzzy-guess):
 *   1. Exact normalized equality (e.g. "Popo" → "Popo" only — never Popotla,
 *      never "Ampliacion Popo").
 *   2. Official sectional names whose *entire* base equals the persona name
 *      (e.g. "Polanco" → "Polanco I Seccion" … "Polanco V Seccion").
 */
export function matchOfficialColonias(
  personaColonia: string,
  alcaldia: string,
  official: ColoniaFeature[]
): ColoniaFeature[] {
  const pn = normalizeColoniaName(personaColonia)
  const out: ColoniaFeature[] = []
  for (const o of official) {
    if (o.properties.alc !== alcaldia) continue
    const on = normalizeColoniaName(o.properties.colonia)
    if (on === pn) {
      out.push(o)
      continue
    }
    const { base, section } = coloniaBaseAndSection(on)
    if (section != null && base === pn) out.push(o)
  }
  return out
}

export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!
    const yi = ring[i]![1]!
    const xj = ring[j]![0]!
    const yj = ring[j]![1]!
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function pointInGeometry(lng: number, lat: number, geometry: Geom): boolean {
  const polys: PolygonCoords[] =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.coordinates

  for (const poly of polys) {
    const outer = poly[0]
    if (!outer || !pointInRing(lng, lat, outer)) continue
    let inHole = false
    for (let h = 1; h < poly.length; h++) {
      if (pointInRing(lng, lat, poly[h]!)) {
        inHole = true
        break
      }
    }
    if (!inHole) return true
  }
  return false
}

function bboxOf(coords: unknown): [number, number, number, number] {
  const xs: number[] = []
  const ys: number[] = []
  const walk = (c: unknown): void => {
    if (!Array.isArray(c)) return
    if (typeof c[0] === 'number' && typeof c[1] === 'number') {
      xs.push(c[0] as number)
      ys.push(c[1] as number)
      return
    }
    for (const x of c) walk(x)
  }
  walk(coords)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

function* ringsOf(geometry: Geom): Generator<Ring> {
  const polys: PolygonCoords[] =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.coordinates
  for (const poly of polys) {
    for (const ring of poly) yield ring
  }
}

function* outerRings(geometry: Geom): Generator<Ring> {
  const polys: PolygonCoords[] =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.coordinates
  for (const poly of polys) {
    if (poly[0]) yield poly[0]
  }
}

function orient(a: number[], b: number[], c: number[]): number {
  return (b[1]! - a[1]!) * (c[0]! - b[0]!) - (b[0]! - a[0]!) * (c[1]! - b[1]!)
}

function segmentsIntersect(
  a: number[],
  b: number[],
  c: number[],
  d: number[]
): boolean {
  const o1 = orient(a, b, c)
  const o2 = orient(a, b, d)
  const o3 = orient(c, d, a)
  const o4 = orient(c, d, b)
  return o1 * o2 < 0 && o3 * o4 < 0
}

/** Conservative polygon intersection (bbox + vertices-in + outer edge crosses). */
export function geometriesIntersect(g1: Geom, g2: Geom): boolean {
  const b1 = bboxOf(g1.coordinates)
  const b2 = bboxOf(g2.coordinates)
  if (b1[2] < b2[0] || b2[2] < b1[0] || b1[3] < b2[1] || b2[3] < b1[1]) {
    return false
  }
  for (const ring of ringsOf(g1)) {
    for (const pt of ring) {
      if (pointInGeometry(pt[0]!, pt[1]!, g2)) return true
    }
  }
  for (const ring of ringsOf(g2)) {
    for (const pt of ring) {
      if (pointInGeometry(pt[0]!, pt[1]!, g1)) return true
    }
  }
  for (const r1 of outerRings(g1)) {
    for (const r2 of outerRings(g2)) {
      for (let i = 0; i < r1.length - 1; i++) {
        for (let j = 0; j < r2.length - 1; j++) {
          if (segmentsIntersect(r1[i]!, r1[i + 1]!, r2[j]!, r2[j + 1]!)) {
            return true
          }
        }
      }
    }
  }
  return false
}

/**
 * Sliver filter (same rule as the Python builder).
 * Drop when intersection is < threshold of BOTH the AGEB and the colonia.
 * Keep big AGEBs that fully contain a small colonia (frac_of_ageb small but
 * frac_of_colonia large) and vice versa.
 */
export function isSliverIntersection(
  fracOfAgeb: number,
  fracOfColonia: number,
  threshold = 0.1
): boolean {
  return fracOfAgeb < threshold && fracOfColonia < threshold
}

export function populationWeight(row: PopRow | undefined): {
  weight: number
  source: 'P_18YMAS' | 'POBTOT' | 'uniform'
} {
  if (row) {
    if (row.P_18YMAS != null && row.P_18YMAS > 0) {
      return { weight: row.P_18YMAS, source: 'P_18YMAS' }
    }
    if (row.POBTOT != null && row.POBTOT > 0) {
      return { weight: row.POBTOT, source: 'POBTOT' }
    }
  }
  return { weight: 1, source: 'uniform' }
}

/**
 * Expected adults of AGEB living inside the colonia:
 *   weight = P_18YMAS × (intersection_area / AGEB_area)
 */
export function intersectionPopulationWeight(
  row: PopRow | undefined,
  fracOfAgeb: number
): { weight: number; source: 'P_18YMAS' | 'POBTOT' | 'uniform' } {
  const base = populationWeight(row)
  const frac = Number.isFinite(fracOfAgeb) && fracOfAgeb > 0 ? fracOfAgeb : 0
  return { weight: base.weight * frac, source: base.source }
}

/**
 * Deterministic weighted pick. Seed = hash(personaId).
 * Probability ∝ weight. Candidates must be pre-sorted for stable ties.
 */
export function pickWeightedDeterministic(
  personaId: string,
  candidates: ReadonlyArray<{ code: string; weight: number }>
): string {
  if (candidates.length === 0) {
    throw new Error('pickWeightedDeterministic: empty candidates')
  }
  const sorted = [...candidates].sort((a, b) => a.code.localeCompare(b.code))
  const total = sorted.reduce((s, c) => s + c.weight, 0)
  if (!(total > 0)) {
    const rng = createSeededRng(`ageb-pick:${personaId}`)
    return sorted[Math.floor(rng.next() * sorted.length)]!.code
  }
  const rng = createSeededRng(`ageb-pick:${personaId}`)
  let r = rng.next() * total
  for (const c of sorted) {
    r -= c.weight
    if (r < 0) return c.code
  }
  return sorted[sorted.length - 1]!.code
}

/**
 * Small deterministic jitter around a base inside-point, guaranteed inside
 * the given polygon (colonia∩AGEB intersection, or AGEB for fallback).
 * Seeded by persona id.
 */
export function jitterInsidePolygon(
  personaId: string,
  geometry: Geom,
  baseLat: number,
  baseLng: number,
  opts?: { maxOffsetDeg?: number; maxAttempts?: number }
): { lat: number; lng: number } {
  const maxOffset = opts?.maxOffsetDeg ?? 0.00035 // ~35–40 m
  const maxAttempts = opts?.maxAttempts ?? 64
  const rng = createSeededRng(`ageb-jitter:${personaId}`)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const scale = 1 - attempt / (maxAttempts * 1.25)
    const dLat = rng.nextFloat(-maxOffset, maxOffset) * scale
    const dLng = rng.nextFloat(-maxOffset, maxOffset) * scale
    const lat = baseLat + dLat
    const lng = baseLng + dLng
    if (pointInGeometry(lng, lat, geometry)) {
      return {
        lat: Math.round(lat * 1e6) / 1e6,
        lng: Math.round(lng * 1e6) / 1e6,
      }
    }
  }

  if (pointInGeometry(baseLng, baseLat, geometry)) {
    return {
      lat: Math.round(baseLat * 1e6) / 1e6,
      lng: Math.round(baseLng * 1e6) / 1e6,
    }
  }
  throw new Error(
    `jitterInsidePolygon: could not place point inside polygon for ${personaId}`
  )
}

export function candidateKey(alcaldia: string, colonia: string): string {
  return `${alcaldia}||${colonia}`
}

export function assignPersona(args: {
  persona: PersonaInput
  agebs: AgebFeature[]
  colonias: ColoniaFeature[]
  population: Record<string, PopRow>
  candidateIndex: ColoniaCandidateIndex
}): Assignment {
  const { persona, agebs, colonias, population, candidateIndex } = args
  const base = {
    id: persona.id,
    alcaldia: persona.alcaldia,
    colonia: persona.colonia,
    official_colonia_names: [] as string[],
    candidate_count: 0,
    candidates_before: null as number | null,
    weight_source: null as Assignment['weight_source'],
    frac_of_ageb: null as number | null,
  }

  if (!ALLOWED_ALCALDIAS.has(persona.alcaldia)) {
    return {
      ...base,
      ageb_code: null,
      centroid_lat: null,
      centroid_lng: null,
      method: 'unassigned_outside_scope',
    }
  }

  // Prefer precomputed sliver-filtered intersection candidates.
  if (persona.colonia) {
    const entry =
      candidateIndex.entries[candidateKey(persona.alcaldia, persona.colonia)]
    if (entry && entry.official_names.length > 0) {
      base.official_colonia_names = [...entry.official_names]
      base.candidates_before = entry.candidates_before
      const kept = entry.candidates
      if (kept.length > 0) {
        const weighted = kept.map((c) => {
          const { weight, source } = intersectionPopulationWeight(
            population[c.ageb_code],
            c.frac_of_ageb
          )
          return { code: c.ageb_code, weight, source, candidate: c }
        })
        const sourceCounts = new Map<string, number>()
        for (const w of weighted) {
          sourceCounts.set(w.source, (sourceCounts.get(w.source) ?? 0) + 1)
        }
        const weight_source = [...sourceCounts.entries()].sort(
          (a, b) => b[1] - a[1]
        )[0]![0] as Assignment['weight_source']

        const pickedCode = pickWeightedDeterministic(
          persona.id,
          weighted.map((w) => ({ code: w.code, weight: w.weight }))
        )
        const cand = kept.find((c) => c.ageb_code === pickedCode)!
        const jittered = jitterInsidePolygon(
          persona.id,
          cand.intersection,
          cand.point_on_surface.lat,
          cand.point_on_surface.lng
        )
        return {
          ...base,
          ageb_code: pickedCode,
          centroid_lat: jittered.lat,
          centroid_lng: jittered.lng,
          method: 'colonia_census_weighted',
          candidate_count: kept.length,
          weight_source,
          frac_of_ageb: cand.frac_of_ageb,
        }
      }
    } else {
      // Index miss: still report official name match for the report.
      const matched = matchOfficialColonias(
        persona.colonia,
        persona.alcaldia,
        colonias
      )
      base.official_colonia_names = matched.map((m) => m.properties.colonia)
    }
  }

  // Alcaldía fallback — no colonia intersection available.
  const fallback = agebs.filter((a) => a.properties.alcaldia === persona.alcaldia)
  if (fallback.length === 0) {
    return {
      ...base,
      ageb_code: null,
      centroid_lat: null,
      centroid_lng: null,
      method: 'unassigned_no_candidates',
    }
  }

  const weighted = fallback.map((c) => {
    const { weight, source } = populationWeight(population[c.properties.ageb_code])
    return { code: c.properties.ageb_code, weight, source, feature: c }
  })
  const sourceCounts = new Map<string, number>()
  for (const w of weighted) {
    sourceCounts.set(w.source, (sourceCounts.get(w.source) ?? 0) + 1)
  }
  const weight_source = [...sourceCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0]![0] as Assignment['weight_source']

  const pickedCode = pickWeightedDeterministic(
    persona.id,
    weighted.map((w) => ({ code: w.code, weight: w.weight }))
  )
  const feat = fallback.find((c) => c.properties.ageb_code === pickedCode)!
  const jittered = jitterInsidePolygon(
    persona.id,
    feat.geometry,
    feat.properties.centroid_lat,
    feat.properties.centroid_lng
  )

  return {
    ...base,
    ageb_code: pickedCode,
    centroid_lat: jittered.lat,
    centroid_lng: jittered.lng,
    method: 'alcaldia_fallback',
    candidate_count: fallback.length,
    weight_source,
    frac_of_ageb: null,
  }
}

export { ALLOWED_ALCALDIAS }
