/**
 * Pure helpers for Task 4a.2 — assign real INEGI AGEBs to simulation personas.
 * No I/O. Deterministic picks + inside-polygon jitter.
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
  weight_source: 'P_18YMAS' | 'POBTOT' | 'uniform' | null
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
  // "Col." / "Col " / "colonia " prefixes — drop without leaving a stray "."
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
 *      The official name must match `^<base> <roman|digit> seccion$` after
 *      normalize; a longer compound name that merely *contains* the persona
 *      string does not qualify.
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
    // Sectional expansion only when the official name is exactly
    // "<personaBase> <section> seccion". Rejects Popotla / Ampliacion Popo
    // for persona "Popo".
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
 * Small deterministic jitter around the AGEB inside-point, guaranteed inside
 * the polygon via PIP retries. Seeded by persona id.
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

  if (pointInGeometry(baseLng, baseLat, geometry)) {
    // try jittered points; fall back to base if none land inside
  } else {
    // Base should be point-on-surface from GeoJSON; if somehow outside, search.
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Shrink radius over attempts so we eventually land near the base.
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

  // Guaranteed fallback: the GeoJSON centroid is an inside point.
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

export function agebsIntersectingColonias(
  colonias: ColoniaFeature[],
  agebs: AgebFeature[],
  alcaldia: string
): AgebFeature[] {
  const pool = agebs.filter((a) => a.properties.alcaldia === alcaldia)
  const hits: AgebFeature[] = []
  const seen = new Set<string>()
  for (const col of colonias) {
    for (const ageb of pool) {
      const code = ageb.properties.ageb_code
      if (seen.has(code)) continue
      if (geometriesIntersect(col.geometry, ageb.geometry)) {
        seen.add(code)
        hits.push(ageb)
      }
    }
  }
  return hits
}

export function assignPersona(args: {
  persona: PersonaInput
  agebs: AgebFeature[]
  colonias: ColoniaFeature[]
  population: Record<string, PopRow>
}): Assignment {
  const { persona, agebs, colonias, population } = args
  const base = {
    id: persona.id,
    alcaldia: persona.alcaldia,
    colonia: persona.colonia,
    official_colonia_names: [] as string[],
    candidate_count: 0,
    weight_source: null as Assignment['weight_source'],
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

  let method: AssignmentMethod = 'colonia_census_weighted'
  let candidates: AgebFeature[] = []

  if (persona.colonia) {
    const matched = matchOfficialColonias(
      persona.colonia,
      persona.alcaldia,
      colonias
    )
    base.official_colonia_names = matched.map((m) => m.properties.colonia)
    if (matched.length > 0) {
      candidates = agebsIntersectingColonias(
        matched,
        agebs,
        persona.alcaldia
      )
    }
  }

  if (candidates.length === 0) {
    method = 'alcaldia_fallback'
    candidates = agebs.filter((a) => a.properties.alcaldia === persona.alcaldia)
  }

  if (candidates.length === 0) {
    return {
      ...base,
      ageb_code: null,
      centroid_lat: null,
      centroid_lng: null,
      method: 'unassigned_no_candidates',
    }
  }

  const weighted = candidates.map((c) => {
    const { weight, source } = populationWeight(population[c.properties.ageb_code])
    return { code: c.properties.ageb_code, weight, source, feature: c }
  })
  // Prefer documenting the dominant weight source among candidates.
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
  const feat = candidates.find((c) => c.properties.ageb_code === pickedCode)!
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
    method,
    candidate_count: candidates.length,
    weight_source,
  }
}

export { ALLOWED_ALCALDIAS }
