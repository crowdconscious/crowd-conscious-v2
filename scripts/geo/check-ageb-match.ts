#!/usr/bin/env node
/**
 * scripts/geo/check-ageb-match.ts
 *
 * Compare persona AGEB codes found in the repo (and optionally production
 * simulation_personas) against public/geo/ageb-cuauhtemoc-mh.geojson.
 *
 * Reports:
 *   - code format observed in personas
 *   - matched / unmatched counts
 *   - persona centroids that fall outside their AGEB polygon
 *
 * Usage (from repo root):
 *   node --experimental-strip-types scripts/geo/check-ageb-match.ts
 *   # validate Task 4a.2 assignment output:
 *   node --experimental-strip-types scripts/geo/check-ageb-match.ts --assignments
 *   # optional READ-ONLY prod check when env is set:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node --experimental-strip-types scripts/geo/check-ageb-match.ts --prod
 *
 * Never invents AGEB codes. Fixture FIX-* / synthetic codes are reported as
 * unmatched and classified as non-INEGI.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

type GeoFeature = {
  type: 'Feature'
  properties: {
    ageb_code: string
    cvegeo: string
    alcaldia: 'Cuauhtémoc' | 'Miguel Hidalgo'
    centroid_lat: number
    centroid_lng: number
  }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

type PersonaHit = {
  source: string
  agebCode: string
  centroidLat: number | null
  centroidLng: number | null
  kind: 'fixture-fix' | 'synthetic-numeric' | 'cvegeo-13' | 'ageb-4' | 'other'
}

const ROOT = process.cwd()
const GEOJSON_PATH = join(ROOT, 'public/geo/ageb-cuauhtemoc-mh.geojson')
const COLONIAS_PATH = join(ROOT, 'public/geo/colonias-cuau-mh.geojson')
const ASSIGNMENTS_PATH = join(ROOT, 'public/geo/persona-ageb-assignments.json')

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.deprecated',
  'dist',
  'coverage',
])

function classifyCode(code: string): PersonaHit['kind'] {
  if (code.startsWith('FIX')) return 'fixture-fix'
  if (/^\d{13}$/.test(code) || /^[0-9]{12}[0-9A-Z]$/.test(code)) return 'cvegeo-13'
  if (/^\d{4}$/.test(code) || /^[0-9]{3}[0-9A-Z]$/.test(code)) return 'ageb-4'
  if (/^\d{6}$/.test(code)) return 'synthetic-numeric'
  return 'other'
}

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walkFiles(full, out)
    else if (/\.(json|ts|tsx|js|mjs|sql|md)$/.test(name)) out.push(full)
  }
  return out
}

/** Point-in-polygon (ray cast). ring = [[lng,lat], ...] */
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
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

function pointInGeometry(
  lng: number,
  lat: number,
  geometry: GeoFeature['geometry']
): boolean {
  const polys: number[][][][] =
    geometry.type === 'Polygon'
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][])

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

function collectRepoPersonas(): PersonaHit[] {
  const hits: PersonaHit[] = []
  const files = walkFiles(ROOT)

  // JSON fixtures / generated data: look for agebCode / ageb_code fields.
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    let text: string
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    if (!/agebCode|ageb_code/.test(text)) continue

    // Prefer structured parse when the file is a single JSON value.
    try {
      const data = JSON.parse(text) as unknown
      collectFromJson(data, relative(ROOT, file), hits)
      continue
    } catch {
      // fall through to regex for non-strict JSON
    }

    const re =
      /"ageb(?:Code|_code)"\s*:\s*"([^"]+)"[\s\S]{0,400}?"centroidLat(?:itude)?"\s*:\s*(-?\d+(?:\.\d+)?)[\s\S]{0,200}?"centroidLng(?:itude)?"\s*:\s*(-?\d+(?:\.\d+)?)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      hits.push({
        source: relative(ROOT, file),
        agebCode: m[1]!,
        centroidLat: Number(m[2]),
        centroidLng: Number(m[3]),
        kind: classifyCode(m[1]!),
      })
    }
    // Also catch codes without nearby centroids.
    const reCode = /"ageb(?:Code|_code)"\s*:\s*"([^"]+)"/g
    const seen = new Set(hits.filter((h) => h.source === relative(ROOT, file)).map((h) => h.agebCode))
    while ((m = reCode.exec(text))) {
      if (seen.has(m[1]!)) continue
      seen.add(m[1]!)
      hits.push({
        source: relative(ROOT, file),
        agebCode: m[1]!,
        centroidLat: null,
        centroidLng: null,
        kind: classifyCode(m[1]!),
      })
    }
  }

  // Seed / generator TypeScript literals.
  for (const file of files) {
    if (!/\.(ts|tsx|js|mjs)$/.test(file)) continue
    const text = readFileSync(file, 'utf8')
    if (!/agebCode|ageb_code/.test(text)) continue
    const re = /ageb(?:Code|_code)\s*[:=]\s*['"]([^'"]+)['"]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      hits.push({
        source: relative(ROOT, file),
        agebCode: m[1]!,
        centroidLat: null,
        centroidLng: null,
        kind: classifyCode(m[1]!),
      })
    }
  }

  return hits
}

function collectFromJson(node: unknown, source: string, hits: PersonaHit[]): void {
  if (node == null) return
  if (Array.isArray(node)) {
    for (const item of node) collectFromJson(item, source, hits)
    return
  }
  if (typeof node !== 'object') return
  const obj = node as Record<string, unknown>
  const code = (obj.agebCode ?? obj.ageb_code) as string | undefined
  if (typeof code === 'string') {
    const latRaw = obj.centroidLat ?? obj.centroid_lat
    const lngRaw = obj.centroidLng ?? obj.centroid_lng
    hits.push({
      source,
      agebCode: code,
      centroidLat: typeof latRaw === 'number' ? latRaw : null,
      centroidLng: typeof lngRaw === 'number' ? lngRaw : null,
      kind: classifyCode(code),
    })
  }
  for (const v of Object.values(obj)) collectFromJson(v, source, hits)
}

async function fetchProdPersonas(): Promise<PersonaHit[] | null> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/simulation_personas?select=ageb_code,centroid_lat,centroid_lng&ageb_code=not.is.null`
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Prod READ failed: ${res.status} ${await res.text()}`)
  }
  const rows = (await res.json()) as Array<{
    ageb_code: string | null
    centroid_lat: number | null
    centroid_lng: number | null
  }>
  return rows
    .filter((r) => r.ageb_code)
    .map((r) => ({
      source: 'production:simulation_personas',
      agebCode: r.ageb_code!,
      centroidLat: r.centroid_lat,
      centroidLng: r.centroid_lng,
      kind: classifyCode(r.ageb_code!),
    }))
}

function summarize(label: string, personas: PersonaHit[], byCode: Map<string, GeoFeature>) {
  const uniqueCodes = [...new Set(personas.map((p) => p.agebCode))]
  const matched = uniqueCodes.filter((c) => byCode.has(c))
  const unmatched = uniqueCodes.filter((c) => !byCode.has(c))

  let centroidOutside = 0
  let centroidChecked = 0
  const outsideExamples: string[] = []

  for (const p of personas) {
    if (p.centroidLat == null || p.centroidLng == null) continue
    const feat = byCode.get(p.agebCode)
    if (!feat) continue
    centroidChecked += 1
    if (!pointInGeometry(p.centroidLng, p.centroidLat, feat.geometry)) {
      centroidOutside += 1
      if (outsideExamples.length < 10) {
        outsideExamples.push(
          `${p.agebCode} @ (${p.centroidLat}, ${p.centroidLng}) from ${p.source}`
        )
      }
    }
  }

  const kindCounts: Record<string, number> = {}
  for (const p of personas) {
    kindCounts[p.kind] = (kindCounts[p.kind] ?? 0) + 1
  }

  return {
    label,
    persona_rows: personas.length,
    unique_codes: uniqueCodes.length,
    matched_unique: matched.length,
    unmatched_unique: unmatched.length,
    unmatched_codes_sample: unmatched.slice(0, 30),
    kind_counts: kindCounts,
    centroid_checked: centroidChecked,
    centroid_outside: centroidOutside,
    centroid_outside_sample: outsideExamples,
  }
}

function loadAssignmentHits(): PersonaHit[] {
  if (!existsSync(ASSIGNMENTS_PATH)) {
    throw new Error(
      `Missing ${ASSIGNMENTS_PATH}. Run scripts/geo/assign-persona-agebs.ts first.`
    )
  }
  const data = JSON.parse(readFileSync(ASSIGNMENTS_PATH, 'utf8')) as {
    assignments: Array<{
      ageb_code: string | null
      centroid_lat: number | null
      centroid_lng: number | null
    }>
  }
  return data.assignments
    .filter((a) => a.ageb_code)
    .map((a) => ({
      source: 'public/geo/persona-ageb-assignments.json',
      agebCode: a.ageb_code!,
      centroidLat: a.centroid_lat,
      centroidLng: a.centroid_lng,
      kind: classifyCode(a.ageb_code!),
    }))
}

type AssignmentFull = {
  id: string
  alcaldia: string
  colonia: string | null
  ageb_code: string | null
  centroid_lat: number | null
  centroid_lng: number | null
  official_colonia_names: string[]
  method: string
}

function validateInsideMatchedColonias(): {
  checked: number
  outside: number
  outside_sample: string[]
} {
  if (!existsSync(COLONIAS_PATH)) {
    throw new Error(`Missing ${COLONIAS_PATH}`)
  }
  const colFc = JSON.parse(readFileSync(COLONIAS_PATH, 'utf8')) as {
    features: Array<{
      properties: { colonia: string; alc: string }
      geometry: GeoFeature['geometry']
    }>
  }
  const byKey = new Map<string, (typeof colFc.features)[0]>()
  for (const f of colFc.features) {
    byKey.set(`${f.properties.alc}||${f.properties.colonia}`, f)
  }

  const data = JSON.parse(readFileSync(ASSIGNMENTS_PATH, 'utf8')) as {
    assignments: AssignmentFull[]
  }

  let checked = 0
  let outside = 0
  const outside_sample: string[] = []

  for (const a of data.assignments) {
    if (a.ageb_code == null || a.centroid_lat == null || a.centroid_lng == null) {
      continue
    }
    if (a.method !== 'colonia_census_weighted') continue
    if (!a.official_colonia_names?.length) continue

    checked += 1
    const insideAny = a.official_colonia_names.some((name) => {
      const feat = byKey.get(`${a.alcaldia}||${name}`)
      if (!feat) return false
      return pointInGeometry(a.centroid_lng!, a.centroid_lat!, feat.geometry)
    })
    if (!insideAny) {
      outside += 1
      if (outside_sample.length < 10) {
        outside_sample.push(
          `${a.id} ${a.colonia} @ (${a.centroid_lat}, ${a.centroid_lng}) official=${a.official_colonia_names.join('|')}`
        )
      }
    }
  }

  return { checked, outside, outside_sample }
}

async function main() {
  const wantProd = process.argv.includes('--prod')
  const wantAssignments = process.argv.includes('--assignments')

  if (!existsSync(GEOJSON_PATH)) {
    console.error(`Missing ${GEOJSON_PATH}. Run scripts/geo/build-ageb-geojson.sh first.`)
    process.exit(1)
  }

  const geo = JSON.parse(readFileSync(GEOJSON_PATH, 'utf8')) as {
    features: GeoFeature[]
  }
  const byCode = new Map<string, GeoFeature>()
  for (const f of geo.features) {
    byCode.set(f.properties.ageb_code, f)
    byCode.set(f.properties.cvegeo, f)
  }

  if (wantAssignments) {
    const hits = loadAssignmentHits()
    const summary = summarize('assignments', hits, byCode)
    const coloniaCheck = validateInsideMatchedColonias()
    console.log('=== Task 4a.2 assignment validation ===')
    console.log(JSON.stringify({ ...summary, colonia_pip: coloniaCheck }, null, 2))
    const allMatched = summary.unmatched_unique === 0
    const allInside = summary.centroid_outside === 0
    const allInsideColonia = coloniaCheck.outside === 0
    if (!allMatched || !allInside || !allInsideColonia) {
      console.error(
        `\nFAIL: assigned codes must exist in GeoJSON; centroids must be inside AGEB and matched official colonia polygons.`
      )
      process.exit(1)
    }
    console.log(
      `\nPASS: ${summary.persona_rows} assigned — AGEB codes match GeoJSON; ` +
        `centroids inside AGEB (${summary.centroid_checked}) and inside matched colonia (${coloniaCheck.checked}).`
    )
    return
  }

  const repoPersonas = collectRepoPersonas()
  const repoSummary = summarize('repo', repoPersonas, byCode)

  console.log('=== AGEB match report ===')
  console.log(
    `GeoJSON features: ${geo.features.length} (ageb_code = full 13-char CVEGEO)`
  )
  console.log(JSON.stringify(repoSummary, null, 2))

  // Plain-language verdict for the task report.
  const realKinds = (repoSummary.kind_counts['cvegeo-13'] ?? 0) + (repoSummary.kind_counts['ageb-4'] ?? 0)
  if (realKinds === 0) {
    console.log(
      '\nVERDICT: Repo personas carry NO real INEGI AGEB codes. ' +
        'Fixtures use FIX-* prefixes and/or synthetic numeric codes (e.g. 091xxx). ' +
        'Generated cdmx-v1 personas are colonia-based and have no ageb_code field. ' +
        'Do not invent codes to force a match. GeoJSON ageb_code uses full CVEGEO ' +
        'so production personas can adopt that format when real AGEB grounding lands.'
    )
  }

  if (wantProd) {
    const prod = await fetchProdPersonas()
    if (!prod) {
      console.log(
        '\nPROD: skipped — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (READ-ONLY) to check simulation_personas.'
      )
    } else {
      console.log(JSON.stringify(summarize('production', prod, byCode), null, 2))
    }
  } else {
    console.log(
      '\nPROD: not checked in this run (pass --prod with Supabase env). ' +
        'Needs a READ-ONLY query against simulation_personas.ageb_code.'
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
