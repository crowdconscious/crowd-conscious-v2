#!/usr/bin/env node
/**
 * scripts/geo/assign-persona-agebs.ts
 *
 * Task 4a.2 — assign a REAL INEGI AGEB (full 13-char CVEGEO) to each
 * simulation persona using:
 *   1. alcaldía scope (Cuauhtémoc / Miguel Hidalgo only)
 *   2. official CDMX colonia geometry ∩ AGEB polygons
 *   3. Censo 2020 AGEB population weights (P_18YMAS, else POBTOT)
 *   4. deterministic seeded pick + inside-polygon jitter
 *
 * Never fabricates codes, coordinates, populations, or colonia matches.
 *
 * Usage (from repo root):
 *   # Owner CSV (preferred — includes production UUIDs):
 *   node --experimental-strip-types scripts/geo/assign-persona-agebs.ts \
 *     --in personas.csv
 *
 *   # READ-ONLY prod fetch when credentials exist:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node --experimental-strip-types scripts/geo/assign-persona-agebs.ts --prod
 *
 *   # Dry-run against in-repo generated personas (synthetic ids for report only;
 *   # does NOT emit production UPDATE SQL unless --allow-synthetic-sql):
 *   node --experimental-strip-types scripts/geo/assign-persona-agebs.ts --from-generated
 *
 * Outputs:
 *   supabase/sql-manual/268_persona_ageb_assign.sql
 *   public/geo/PERSONA-AGEB-REPORT.md
 *   public/geo/persona-ageb-assignments.json  (audit trail)
 */

import {
  createHash,
  randomUUID,
} from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assignPersona,
  type AgebFeature,
  type Assignment,
  type ColoniaFeature,
  type PersonaInput,
  type PopRow,
} from './persona-ageb-lib.ts'

const ROOT = process.cwd()
const GEOJSON_PATH = join(ROOT, 'public/geo/ageb-cuauhtemoc-mh.geojson')
const COLONIAS_PATH = join(ROOT, 'public/geo/colonias-cuau-mh.geojson')
const POP_PATH = join(ROOT, 'public/geo/ageb-population-cuau-mh.json')
const SOURCE_MD = join(ROOT, 'public/geo/SOURCE.md')
const REPORT_PATH = join(ROOT, 'public/geo/PERSONA-AGEB-REPORT.md')
const ASSIGNMENTS_JSON = join(ROOT, 'public/geo/persona-ageb-assignments.json')
const SQL_PATH = join(ROOT, 'supabase/sql-manual/268_persona_ageb_assign.sql')
const SELECT_PATH = join(
  ROOT,
  'supabase/sql-manual/SELECT_personas_for_ageb_assign.sql'
)

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Cli = {
  inPath: string | null
  prod: boolean
  fromGenerated: boolean
  allowSyntheticSql: boolean
  help: boolean
}

function parseCli(argv: string[]): Cli {
  const args = argv.slice(2)
  const flagValue = (flag: string): string | undefined => {
    const i = args.indexOf(flag)
    if (i === -1) return undefined
    const next = args[i + 1]
    return next && !next.startsWith('--') ? next : undefined
  }
  return {
    inPath: flagValue('--in') ?? null,
    prod: args.includes('--prod'),
    fromGenerated: args.includes('--from-generated'),
    allowSyntheticSql: args.includes('--allow-synthetic-sql'),
    help: args.includes('--help') || args.includes('-h'),
  }
}

const USAGE = `assign-persona-agebs.ts — Task 4a.2

  --in <csv>              CSV with columns: id, alcaldia, colonia
                          (plus optional income_band, nse_band, age, gender)
  --prod                  READ-ONLY fetch from simulation_personas
  --from-generated        Use data/personas.cdmx-v1.generated.json (synthetic ids)
  --allow-synthetic-sql   Emit UPDATE SQL even when ids are not production UUIDs
`

function sha256File(path: string): string {
  const buf = readFileSync(path)
  return createHash('sha256').update(buf).digest('hex')
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]!)
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!)
    const row: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]!] = cols[c] ?? ''
    }
    rows.push(row)
  }
  return rows
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQ = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQ = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function csvNull(v: string | undefined): string | null {
  if (v == null) return null
  const t = v.trim()
  if (t === '' || t.toLowerCase() === 'null') return null
  return t
}

function loadPersonasFromCsv(path: string): PersonaInput[] {
  const rows = parseCsv(readFileSync(path, 'utf8'))
  return rows.map((r) => {
    const id = csvNull(r.id || r.ID)
    if (!id) throw new Error(`CSV row missing id: ${JSON.stringify(r)}`)
    const alcaldia = csvNull(r.alcaldia || r.Alcaldia)
    if (!alcaldia) throw new Error(`CSV row ${id} missing alcaldia`)
    const ageRaw = csvNull(r.age)
    return {
      id,
      alcaldia,
      colonia: csvNull(r.colonia || r.Colonia),
      income_band: csvNull(r.income_band),
      nse_band: csvNull(r.nse_band),
      age: ageRaw != null && Number.isFinite(Number(ageRaw)) ? Number(ageRaw) : null,
      gender: csvNull(r.gender),
    }
  })
}

/** Synthetic but stable UUID from persona content — report/dry-run only. */
function syntheticIdFromPersona(p: Record<string, unknown>, index: number): string {
  const h = createHash('sha256')
    .update(
      JSON.stringify({
        i: index,
        version: p.version,
        alcaldia: p.alcaldia,
        colonia: p.colonia,
        age: p.age,
        gender: p.gender,
        occupation: p.occupation,
        income_band: p.income_band,
        narrative: p.persona_narrative,
      })
    )
    .digest('hex')
  // Format as UUID v5-like (version nibble = 5) for readability — NOT a prod id.
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

function loadFromGenerated(): { personas: PersonaInput[]; synthetic: true } {
  const path = join(ROOT, 'data/personas.cdmx-v1.generated.json')
  const data = JSON.parse(readFileSync(path, 'utf8')) as {
    personas: Array<Record<string, unknown>>
  }
  const personas = data.personas.map((p, i) => ({
    id: syntheticIdFromPersona(p, i),
    alcaldia: String(p.alcaldia),
    colonia: (p.colonia as string | null) ?? null,
    income_band: (p.income_band as string | null) ?? null,
    nse_band: null,
    age: typeof p.age === 'number' ? p.age : null,
    gender: (p.gender as string | null) ?? null,
  }))
  return { personas, synthetic: true }
}

async function fetchProdPersonas(): Promise<PersonaInput[]> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for --prod'
    )
  }
  const endpoint =
    `${url.replace(/\/$/, '')}/rest/v1/simulation_personas` +
    `?select=id,alcaldia,colonia,income_band,nse_band,age,gender,version` +
    `&version=eq.cdmx-v1&order=created_at.asc`
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
    id: string
    alcaldia: string
    colonia: string | null
    income_band: string | null
    nse_band: string | null
    age: number | null
    gender: string | null
  }>
  return rows.map((r) => ({
    id: r.id,
    alcaldia: r.alcaldia,
    colonia: r.colonia,
    income_band: r.income_band,
    nse_band: r.nse_band,
    age: r.age,
    gender: r.gender,
  }))
}

function loadGeo(): {
  agebs: AgebFeature[]
  colonias: ColoniaFeature[]
  population: Record<string, PopRow>
} {
  for (const p of [GEOJSON_PATH, COLONIAS_PATH, POP_PATH]) {
    if (!existsSync(p)) {
      throw new Error(`Missing required geo artifact: ${p}`)
    }
  }
  const agebFc = JSON.parse(readFileSync(GEOJSON_PATH, 'utf8')) as {
    features: AgebFeature[]
  }
  const colFc = JSON.parse(readFileSync(COLONIAS_PATH, 'utf8')) as {
    features: ColoniaFeature[]
  }
  const population = JSON.parse(readFileSync(POP_PATH, 'utf8')) as Record<
    string,
    PopRow
  >
  return {
    agebs: agebFc.features,
    colonias: colFc.features,
    population,
  }
}

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''")
}

function emitSql(
  assignments: Assignment[],
  opts: { syntheticIds: boolean; runId: string }
): string {
  const lines: string[] = []
  lines.push(`-- 268_persona_ageb_assign.sql`)
  lines.push(`-- Task 4a.2 — owner-run UPDATE for simulation_personas AGEB fields.`)
  lines.push(`-- Generated by scripts/geo/assign-persona-agebs.ts`)
  lines.push(`-- run_id: ${opts.runId}`)
  lines.push(`--`)
  lines.push(`-- Touches ONLY: ageb_code, centroid_lat, centroid_lng, ageb_assignment_method`)
  lines.push(`-- Requires migration 268_persona_ageb_assignment_method.sql first.`)
  lines.push(`-- Idempotent: re-running sets the same values for the same persona ids.`)
  lines.push(`-- Never touches prediction_markets / market_votes / real vote tables.`)
  if (opts.syntheticIds) {
    lines.push(`--`)
    lines.push(`-- WARNING: ids in this file are SYNTHETIC (from --from-generated).`)
    lines.push(`-- Do NOT apply to production. Re-run with --in personas.csv or --prod.`)
  }
  lines.push(``)
  lines.push(`begin;`)
  lines.push(``)

  const assigned = assignments.filter((a) => a.ageb_code != null)
  for (const a of assigned) {
    const method =
      a.method === 'colonia_census_weighted' || a.method === 'alcaldia_fallback'
        ? a.method
        : null
    if (!method) continue
    lines.push(
      `update simulation_personas set` +
        `\n  ageb_code = '${sqlEscape(a.ageb_code!)}',` +
        `\n  centroid_lat = ${a.centroid_lat},` +
        `\n  centroid_lng = ${a.centroid_lng},` +
        `\n  ageb_assignment_method = '${method}'` +
        `\nwhere id = '${sqlEscape(a.id)}'::uuid;`
    )
    lines.push(``)
  }

  const skipped = assignments.filter((a) => a.ageb_code == null)
  if (skipped.length) {
    lines.push(`-- Unassigned personas (${skipped.length}):`)
    for (const s of skipped) {
      lines.push(
        `--   ${s.id} alcaldia=${s.alcaldia} colonia=${s.colonia ?? ''} method=${s.method}`
      )
    }
    lines.push(``)
  }

  lines.push(`commit;`)
  lines.push(``)
  lines.push(`-- Verification (read-only; run after the transaction)`)
  lines.push(`select`)
  lines.push(`  ageb_assignment_method,`)
  lines.push(`  count(*) as n`)
  lines.push(`from simulation_personas`)
  lines.push(`where version = 'cdmx-v1'`)
  lines.push(`group by ageb_assignment_method`)
  lines.push(`order by ageb_assignment_method nulls first;`)
  lines.push(``)
  lines.push(`select`)
  lines.push(`  count(*) filter (where ageb_code is null) as null_ageb_code,`)
  lines.push(`  count(*) filter (where ageb_code is not null) as assigned_ageb_code,`)
  lines.push(`  count(*) as total`)
  lines.push(`from simulation_personas`)
  lines.push(`where version = 'cdmx-v1';`)
  lines.push(``)
  return lines.join('\n')
}

function emitSelectSql(): string {
  return `-- SELECT_personas_for_ageb_assign.sql
-- Task 4a.2 — READ-ONLY export for the AGEB assigner.
-- Paste into the Supabase SQL editor, download as CSV, then:
--
--   node --experimental-strip-types scripts/geo/assign-persona-agebs.ts \\
--     --in personas.csv
--
-- Column list must match what assign-persona-agebs.ts expects.

select
  id,
  version,
  alcaldia,
  colonia,
  age,
  gender,
  education,
  occupation,
  income_band,
  nse_band,
  persona_key,
  ageb_code,
  centroid_lat,
  centroid_lng
from simulation_personas
where version = 'cdmx-v1'
order by created_at asc, id asc;
`
}

function buildReport(args: {
  assignments: Assignment[]
  syntheticIds: boolean
  prodRead: boolean
  sources: {
    ageb_geojson_sha256: string
    colonias_sha256: string
    population_sha256: string
    census_zip_sha256: string
    census_zip_url: string
    colonias_url: string
    colonias_note: string
  }
}): string {
  const { assignments, syntheticIds, prodRead, sources } = args
  const viaColonia = assignments.filter(
    (a) => a.method === 'colonia_census_weighted'
  )
  const viaFallback = assignments.filter(
    (a) => a.method === 'alcaldia_fallback'
  )
  const unassigned = assignments.filter((a) => a.ageb_code == null)

  const unmatchedColonias = [
    ...new Set(
      viaFallback
        .filter((a) => a.colonia)
        .map((a) => `${a.alcaldia} / ${a.colonia}`)
    ),
  ].sort()

  const byAlc = new Map<string, number>()
  const byAgeb = new Map<string, number>()
  for (const a of assignments) {
    byAlc.set(a.alcaldia, (byAlc.get(a.alcaldia) ?? 0) + 1)
    if (a.ageb_code) {
      byAgeb.set(a.ageb_code, (byAgeb.get(a.ageb_code) ?? 0) + 1)
    }
  }
  const topAgebs = [...byAgeb.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)

  const lines: string[] = []
  lines.push(`# Persona → AGEB assignment report (Task 4a.2)`)
  lines.push(``)
  lines.push(`Generated by \`scripts/geo/assign-persona-agebs.ts\`.`)
  lines.push(`**Do not invent AGEB codes or colonia matches outside this pipeline.**`)
  lines.push(``)
  lines.push(`## Counts`)
  lines.push(``)
  lines.push(`| Bucket | Count |`)
  lines.push(`| --- | ---: |`)
  lines.push(`| Total personas | ${assignments.length} |`)
  lines.push(`| Assigned via colonia ∩ census weight | ${viaColonia.length} |`)
  lines.push(`| Assigned via alcaldía fallback | ${viaFallback.length} |`)
  lines.push(`| Unassigned | ${unassigned.length} |`)
  lines.push(``)
  lines.push(`### Personas per alcaldía`)
  lines.push(``)
  lines.push(`| Alcaldía | Count |`)
  lines.push(`| --- | ---: |`)
  for (const [k, v] of [...byAlc.entries()].sort()) {
    lines.push(`| ${k} | ${v} |`)
  }
  lines.push(``)
  lines.push(`### Top 10 AGEBs by persona count`)
  lines.push(``)
  lines.push(`| AGEB (CVEGEO) | Personas |`)
  lines.push(`| --- | ---: |`)
  for (const [code, n] of topAgebs) {
    lines.push(`| \`${code}\` | ${n} |`)
  }
  lines.push(``)

  // Colonia match table: persona colonia → official name(s) → candidate AGEBs → persona count
  type ColoniaRow = {
    alcaldia: string
    colonia: string
    official: string[]
    candidates: number
    personas: number
    method: string
  }
  const coloniaAgg = new Map<string, ColoniaRow>()
  for (const a of assignments) {
    const col = a.colonia ?? '(null)'
    const key = `${a.alcaldia}||${col}`
    const existing = coloniaAgg.get(key)
    if (existing) {
      existing.personas += 1
      // Prefer the colonia-weighted candidate_count when mixed (should not mix).
      if (a.method === 'colonia_census_weighted') {
        existing.candidates = a.candidate_count
        existing.official = a.official_colonia_names
        existing.method = a.method
      }
    } else {
      coloniaAgg.set(key, {
        alcaldia: a.alcaldia,
        colonia: col,
        official: [...a.official_colonia_names],
        candidates: a.candidate_count,
        personas: 1,
        method: a.method,
      })
    }
  }
  const coloniaRows = [...coloniaAgg.values()].sort(
    (a, b) =>
      a.alcaldia.localeCompare(b.alcaldia) ||
      a.colonia.localeCompare(b.colonia)
  )

  lines.push(`## Colonia → official match → candidate AGEBs`)
  lines.push(``)
  lines.push(
    `| Alcaldía | Persona colonia | Official colonia name(s) | Candidate AGEBs | Personas | Method |`
  )
  lines.push(`| --- | --- | --- | ---: | ---: | --- |`)
  for (const r of coloniaRows) {
    const official =
      r.official.length > 0
        ? r.official.map((n) => `\`${n}\``).join(', ')
        : '*(none — alcaldía fallback)*'
    lines.push(
      `| ${r.alcaldia} | ${r.colonia} | ${official} | ${r.candidates} | ${r.personas} | \`${r.method}\` |`
    )
  }
  lines.push(``)
  lines.push(
    `Note: persona **"Popo"** matches only the official colonia named exactly \`Popo\` (Miguel Hidalgo). It is never mapped to \`Popotla\` or \`Ampliacion Popo\`.`
  )
  lines.push(``)

  lines.push(`## Unmatched colonias`)
  lines.push(``)
  if (unmatchedColonias.length === 0) {
    lines.push(
      `None. Every persona colonia string matched at least one official colonia polygon (exact or sectional expansion) in the same alcaldía.`
    )
  } else {
    lines.push(
      `These persona colonias did not match any official colonia name after normalization; candidates fell back to all AGEBs in the alcaldía:`
    )
    lines.push(``)
    for (const u of unmatchedColonias) lines.push(`- ${u}`)
  }
  lines.push(``)
  lines.push(`## Method`)
  lines.push(``)
  lines.push(`1. **Alcaldía filter.** Only Cuauhtémoc and Miguel Hidalgo are in scope (AGEB GeoJSON). Others stay unassigned.`)
  lines.push(`2. **Colonia → AGEB candidates.** An AGEB is a candidate if its polygon spatially intersects an official colonia polygon that matches the persona's colonia string (normalized exact match, or official \`… N Sección\` whose base equals the persona name — e.g. Polanco → Polanco I–V Sección). No fuzzy guessing. **"Popo" matches only "Popo"**, never Popotla / Ampliación Popo.`)
  lines.push(`3. **Fallback.** If the colonia string matches no official name, or intersection yields zero AGEBs, candidates = all AGEBs in the persona's alcaldía (\`alcaldia_fallback\`).`)
  lines.push(`4. **Weights.** Probability ∝ INEGI Censo 2020 \`P_18YMAS\` (population 18+). If missing/zero, \`POBTOT\`. If both missing/zero, uniform weight 1. No NSE/housing secondary proxy — AMAI bands do not map cleanly onto a single AGEB census indicator without inventing a model we cannot defend.`)
  lines.push(`5. **Determinism.** Pick seeded by \`hash(persona.id)\` (\`ageb-pick:<id>\`). Re-runs with the same ids yield identical AGEBs.`)
  lines.push(`6. **Centroid jitter.** Start from the GeoJSON point-on-surface; add a small seeded offset (\`ageb-jitter:<id>\`); accept only points that pass point-in-polygon; retry deterministically; fall back to the inside point.`)
  lines.push(``)
  lines.push(`## Sources (URL, edition, sha256)`)
  lines.push(``)
  lines.push(`| Artifact | URL / edition | sha256 |`)
  lines.push(`| --- | --- | --- |`)
  lines.push(
    `| AGEB polygons | INEGI Marco Geoestadístico CPV 2020 — see \`SOURCE.md\` (\`public/geo/ageb-cuauhtemoc-mh.geojson\`) | \`${sources.ageb_geojson_sha256}\` |`
  )
  lines.push(
    `| Colonias geometry | ${sources.colonias_url} — ${sources.colonias_note} | \`${sources.colonias_sha256}\` |`
  )
  lines.push(
    `| AGEB population | ${sources.census_zip_url} (Principales resultados por AGEB y manzana urbana, CPV 2020, entidad 09; AGEB rows \`MZA=000\` / Total AGEB urbana; fields \`P_18YMAS\`, \`POBTOT\`) | zip \`${sources.census_zip_sha256}\`; derived JSON \`${sources.population_sha256}\` |`
  )
  lines.push(``)
  lines.push(`## Production read`)
  lines.push(``)
  if (prodRead) {
    lines.push(`Read production \`simulation_personas\` (version = cdmx-v1) successfully.`)
  } else if (syntheticIds) {
    lines.push(
      `Could **not** read production. Report + algorithm validation used \`data/personas.cdmx-v1.generated.json\` with **synthetic ids** (content hash). Owner must run the SELECT in \`supabase/sql-manual/SELECT_personas_for_ageb_assign.sql\`, save CSV, and re-run:`
    )
    lines.push(``)
    lines.push('```bash')
    lines.push(
      'node --experimental-strip-types scripts/geo/assign-persona-agebs.ts --in personas.csv'
    )
    lines.push('```')
    lines.push(``)
    lines.push(
      `Then paste the regenerated \`supabase/sql-manual/268_persona_ageb_assign.sql\` into the Supabase SQL editor (after migration 268).`
    )
  } else {
    lines.push(
      `Personas loaded from owner CSV (\`--in\`) with **production UUIDs**. UPDATE SQL in \`supabase/sql-manual/268_persona_ageb_assign.sql\` is ready to paste (after migration 268).`
    )
  }
  lines.push(``)
  lines.push(`## Validation`)
  lines.push(``)
  lines.push('```bash')
  lines.push('node --experimental-strip-types scripts/geo/check-ageb-match.ts --assignments')
  lines.push('node --experimental-strip-types --test scripts/geo/assign-persona-agebs.test.ts')
  lines.push('```')
  lines.push(``)
  return lines.join('\n')
}

async function main() {
  const cli = parseCli(process.argv)
  if (cli.help) {
    console.log(USAGE)
    return
  }

  mkdirSync(dirname(SQL_PATH), { recursive: true })
  writeFileSync(SELECT_PATH, emitSelectSql(), 'utf8')

  let personas: PersonaInput[] = []
  let syntheticIds = false
  let prodRead = false

  if (cli.inPath) {
    personas = loadPersonasFromCsv(resolve(ROOT, cli.inPath))
    syntheticIds = !personas.every((p) => UUID_RE.test(p.id))
  } else if (cli.prod) {
    personas = await fetchProdPersonas()
    prodRead = true
  } else if (cli.fromGenerated) {
    const g = loadFromGenerated()
    personas = g.personas
    syntheticIds = true
  } else {
    // Default: try prod, else generated.
    try {
      personas = await fetchProdPersonas()
      prodRead = true
    } catch {
      console.warn(
        'No prod credentials / --in CSV. Falling back to --from-generated for report.'
      )
      const g = loadFromGenerated()
      personas = g.personas
      syntheticIds = true
    }
  }

  if (personas.length === 0) {
    throw new Error('No personas loaded')
  }

  const { agebs, colonias, population } = loadGeo()

  // Verify every population key exists in GeoJSON (no fabricated codes).
  const agebCodes = new Set(agebs.map((a) => a.properties.ageb_code))
  for (const code of Object.keys(population)) {
    if (!agebCodes.has(code)) {
      throw new Error(`Population table has code not in GeoJSON: ${code}`)
    }
  }

  const assignments: Assignment[] = personas.map((p) =>
    assignPersona({ persona: p, agebs, colonias, population })
  )

  const runId = randomUUID()
  const emitSqlFile = !syntheticIds || cli.allowSyntheticSql
  if (emitSqlFile) {
    writeFileSync(
      SQL_PATH,
      emitSql(assignments, { syntheticIds, runId }),
      'utf8'
    )
  } else {
    writeFileSync(
      SQL_PATH,
      `-- 268_persona_ageb_assign.sql
-- NOT YET GENERATED with production persona ids.
-- Owner flow:
--   1. Run supabase/sql-manual/SELECT_personas_for_ageb_assign.sql in Supabase.
--   2. Save result as personas.csv
--   3. node --experimental-strip-types scripts/geo/assign-persona-agebs.ts --in personas.csv
--   4. Paste the regenerated SQL (after migration 268).
--
-- Algorithm validation for this commit used synthetic ids from
-- data/personas.cdmx-v1.generated.json — see public/geo/PERSONA-AGEB-REPORT.md
-- and public/geo/persona-ageb-assignments.json
`,
      'utf8'
    )
  }

  writeFileSync(
    ASSIGNMENTS_JSON,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        run_id: runId,
        synthetic_ids: syntheticIds,
        prod_read: prodRead,
        count: assignments.length,
        assignments,
      },
      null,
      2
    ),
    'utf8'
  )

  const censusZipSha =
    process.env.CENSUS_ZIP_SHA256 ??
    '1f5f123b8e9a50991d1847271b5a2bf321e813e924e5bcf958cab612311c765a'

  const report = buildReport({
    assignments,
    syntheticIds,
    prodRead,
    sources: {
      ageb_geojson_sha256: sha256File(GEOJSON_PATH),
      colonias_sha256: sha256File(COLONIAS_PATH),
      population_sha256: sha256File(POP_PATH),
      census_zip_sha256: censusZipSha,
      census_zip_url:
        'https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/ageb_manzana/ageb_mza_urbana_09_cpv2020_csv.zip',
      colonias_url:
        'https://serviciosatlas.sgirpc.cdmx.gob.mx/arcgis/rest/services/Hosted/Catalogo_Colonias_CDMX/FeatureServer/0',
      colonias_note:
        'CDMX ADIP Catálogo de Colonias (same catalog as datos.cdmx.gob.mx/dataset/catalogo-de-colonias-datos-abiertos). Filtered to cve_alc in (015,016). Direct datos.cdmx.gob.mx TLS timed out from this agent environment; FeatureServer is the official hosted layer.',
    },
  })
  writeFileSync(REPORT_PATH, report, 'utf8')

  // Append colonia + census provenance to SOURCE.md if not already present.
  let sourceMd = readFileSync(SOURCE_MD, 'utf8')
  if (!sourceMd.includes('## Colonia geometry (Task 4a.2)')) {
    sourceMd += `

## Colonia geometry (Task 4a.2)

| Field | Value |
| --- | --- |
| Product | Catálogo de Colonias CDMX (ADIP / Sistema Ajolote) |
| Publisher | Agencia Digital de Innovación Pública (ADIP), Ciudad de México |
| Hosted layer | \`Catalogo_Colonias_CDMX\` FeatureServer (SGIRPC atlas) |
| Download / query URL | https://serviciosatlas.sgirpc.cdmx.gob.mx/arcgis/rest/services/Hosted/Catalogo_Colonias_CDMX/FeatureServer/0 |
| Portal dataset (TLS unreachable from agent) | https://datos.cdmx.gob.mx/dataset/catalogo-de-colonias-datos-abiertos |
| Filter | \`cve_alc IN ('015','016')\` (Cuauhtémoc, Miguel Hidalgo) |
| Retrieval date | 2026-09-29 |
| Output | \`public/geo/colonias-cuau-mh.geojson\` (119 features) |
| sha256 | \`${sha256File(COLONIAS_PATH)}\` |
| Native CRS served | WGS84 / EPSG:4326 (\`outSR=4326\`) |

**Note:** \`datos.cdmx.gob.mx\` TLS handshakes timed out from the cloud agent. The FeatureServer above is the official CDMX-hosted Catálogo de Colonias layer (same catalog). IECM 2019 colonias on the same portal were not separately fetched for the same reason.

## AGEB population weights (Task 4a.2)

| Field | Value |
| --- | --- |
| Product | Principales resultados por AGEB y manzana urbana — Censo de Población y Vivienda 2020 |
| Publisher | INEGI |
| State package | Ciudad de México (\`ageb_mza_urbana_09_cpv2020_csv.zip\`) |
| Download URL | https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/ageb_manzana/ageb_mza_urbana_09_cpv2020_csv.zip |
| Rows used | \`MUN IN ('015','016')\`, \`MZA = '000'\`, \`NOM_LOC\` contains \`Total AGEB urbana\` |
| Weight field | \`P_18YMAS\` (fallback \`POBTOT\` if P_18YMAS missing/zero) |
| Retrieval date | 2026-09-29 |
| Archive sha256 | \`${censusZipSha}\` |
| Derived JSON | \`public/geo/ageb-population-cuau-mh.json\` |
| Derived sha256 | \`${sha256File(POP_PATH)}\` |
`
    writeFileSync(SOURCE_MD, sourceMd, 'utf8')
  }

  const viaColonia = assignments.filter(
    (a) => a.method === 'colonia_census_weighted'
  ).length
  const viaFallback = assignments.filter(
    (a) => a.method === 'alcaldia_fallback'
  ).length
  const unassigned = assignments.filter((a) => a.ageb_code == null).length

  console.log(
    JSON.stringify(
      {
        personas: assignments.length,
        via_colonia: viaColonia,
        via_fallback: viaFallback,
        unassigned,
        synthetic_ids: syntheticIds,
        prod_read: prodRead,
        sql_emitted: emitSqlFile,
        report: REPORT_PATH,
        sql: SQL_PATH,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
