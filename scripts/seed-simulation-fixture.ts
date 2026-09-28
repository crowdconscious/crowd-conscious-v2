/**
 * scripts/seed-simulation-fixture.ts
 *
 * Visor de simulación — Task 1 seed / fixture generator.
 *
 * CLEARLY MARKED AS FIXTURE. Never treat output as a real calibration run.
 *
 * Modes:
 *   npx tsx scripts/seed-simulation-fixture.ts --write-fixture
 *     Writes fixtures/simulation-run.json (Task 2/3 wire shape). No DB needed.
 *
 *   npx tsx scripts/seed-simulation-fixture.ts --pulse-id <uuid>
 *     Inserts ONE fixture run of 150 votes against an existing Pulse.
 *     Requires migration 266 + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *     NEVER writes to prediction_markets, market_votes, or señal tables.
 *
 * GUARDRAILS:
 *   - is_fixture = true, notes start with "FIXTURE"
 *   - sequence_index is a shuffled 0..n-1 (not grouped by option)
 *   - AGEB codes use the FIX- prefix so they can never be mistaken for INEGI
 */

import { randomUUID } from 'node:crypto'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { computeDivergence } from '../lib/divergence.ts'
import type {
  OptionAgg,
  PersonaGrounding,
  SimulationReplayPayload,
  SimulationReplayPersona,
  SimulationReplayVote,
} from '../types/simulation.ts'

// dotenv is optional for --write-fixture (no DB). Only load when present.
try {
  const { config: loadEnv } = require('dotenv') as typeof import('dotenv')
  const envPath = resolve(process.cwd(), '.env.local')
  if (existsSync(envPath)) loadEnv({ path: envPath, override: true })
} catch {
  // no dotenv — fine for fixture-only mode
}

const FIXTURE_VERSION = 'fixture-v1'
const PERSONA_COUNT = 150
const MODEL = 'fixture-model-not-a-real-run'
const PROMPT_VERSION = 'sim-viewer-fixture-v1'

/** Deterministic PRNG (mulberry32) so fixture output is stable across runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
}

type FixtureOption = { id: string; label: string; order: number }

type BuiltPersona = SimulationReplayPersona & {
  /** Internal id used when seeding the DB. */
  id: string
}

const ALCALDIAS = [
  { name: 'Cuauhtémoc', count: 100, lat: 19.4326, lng: -99.1332 },
  { name: 'Miguel Hidalgo', count: 50, lat: 19.4067, lng: -99.2006 },
] as const

const NSE_BANDS = ['A/B', 'C+', 'C', 'C-', 'D+', 'D'] as const
const SEXES = ['femenino', 'masculino'] as const
const EDUCATION = [
  'primaria',
  'secundaria',
  'prepa',
  'licenciatura',
  'posgrado',
] as const

/**
 * Illustrative grounding only — isExample: true. Numbers/shares are NOT real
 * INEGI/ENIGH/AMAI census figures and must never be presented as such.
 */
function buildFixtureGrounding(agebCode: string, nse: string): PersonaGrounding {
  return {
    sources: [
      {
        name: 'INEGI Censo de Población y Vivienda (FIXTURE example)',
        year: 2020,
        url: 'https://www.inegi.org.mx/',
        table: 'FIXTURE — not a real AGEB table',
      },
      {
        name: 'ENIGH (FIXTURE example)',
        year: 2020,
        url: 'https://www.inegi.org.mx/',
      },
      {
        name: 'AMAI NSE (FIXTURE example)',
        year: 2022,
        url: 'https://www.amai.org/',
      },
    ],
    ageb: {
      code: agebCode,
      population: 1000,
      marginals: [
        { label: 'FIXTURE sex split', value: 'illustrative only', share: 0.5 },
        { label: 'FIXTURE NSE band', value: nse, share: 0.2 },
        {
          label: 'FIXTURE education',
          value: 'illustrative only',
          share: 0.3,
        },
      ],
    },
    method:
      'FIXTURE sampling — stratified illustration for the visor. Not a real draw from census microdata.',
    isExample: true,
  }
}

function buildFixturePersonas(rand: () => number): BuiltPersona[] {
  const out: BuiltPersona[] = []
  let idx = 0
  for (const alc of ALCALDIAS) {
    const slug = alc.name === 'Cuauhtémoc' ? 'cuau' : 'mh'
    for (let i = 0; i < alc.count; i++) {
      const n = String(i + 1).padStart(3, '0')
      const nse = NSE_BANDS[i % NSE_BANDS.length]!
      const sex = SEXES[i % SEXES.length]!
      const edu = EDUCATION[i % EDUCATION.length]!
      // FIX- prefix: never a real INEGI AGEB code.
      const agebCode = `FIX-${slug.toUpperCase()}-${String((i % 20) + 1).padStart(3, '0')}`
      const jitterLat = (rand() - 0.5) * 0.02
      const jitterLng = (rand() - 0.5) * 0.02
      out.push({
        id: randomUUID(),
        personaKey: `${slug}-fixture-${nse.toLowerCase().replace('/', '')}-${n}`,
        alcaldia: alc.name,
        colonia: `FIXTURE colonia ${idx + 1}`,
        agebCode,
        centroidLat: alc.lat + jitterLat,
        centroidLng: alc.lng + jitterLng,
        nseBand: nse,
        age: 18 + (i % 50),
        sex,
        education: edu,
        occupation: 'FIXTURE occupation',
        householdSize: 1 + (i % 5),
        personaSummary:
          'FIXTURE persona sintetica — no representa a una persona real. Generada para el visor de simulacion.',
        grounding: buildFixtureGrounding(agebCode, nse),
      })
      idx += 1
    }
  }
  return out
}

function buildFixtureOptions(): FixtureOption[] {
  // Stable UUIDs so the committed JSON fixture does not churn on every regen
  // when only vote timing changes. These are NOT real market_outcomes ids.
  return [
    {
      id: '00000000-0000-4000-8000-000000000001',
      label: 'FIXTURE — Agua',
      order: 0,
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      label: 'FIXTURE — Seguridad',
      order: 1,
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      label: 'FIXTURE — Movilidad',
      order: 2,
    },
  ]
}

function buildVotes(
  personas: BuiltPersona[],
  options: FixtureOption[],
  rand: () => number,
): SimulationReplayVote[] {
  // Target share mix ~45 / 30 / 25 — not grouped; we assign then shuffle.
  const targets = [
    Math.round(PERSONA_COUNT * 0.45),
    Math.round(PERSONA_COUNT * 0.3),
    0,
  ]
  targets[2] = PERSONA_COUNT - targets[0]! - targets[1]!

  const assigned: { option: FixtureOption; persona: BuiltPersona }[] = []
  let p = 0
  for (let oi = 0; oi < options.length; oi++) {
    const n = targets[oi]!
    for (let k = 0; k < n; k++) {
      assigned.push({ option: options[oi]!, persona: personas[p]! })
      p += 1
    }
  }
  shuffleInPlace(assigned, rand)

  return assigned.map((row, sequenceIndex) => {
    const confidence = 1 + Math.floor(rand() * 10)
    return {
      sequenceIndex,
      optionId: row.option.id,
      confidence,
      reasoning: `FIXTURE: elijo ${row.option.label} con certeza ${confidence}.`,
      persona: {
        personaKey: row.persona.personaKey,
        alcaldia: row.persona.alcaldia,
        colonia: row.persona.colonia,
        agebCode: row.persona.agebCode,
        centroidLat: row.persona.centroidLat,
        centroidLng: row.persona.centroidLng,
        nseBand: row.persona.nseBand,
        age: row.persona.age,
        sex: row.persona.sex,
        education: row.persona.education,
        occupation: row.persona.occupation,
        householdSize: row.persona.householdSize,
        personaSummary: row.persona.personaSummary,
        grounding: row.persona.grounding,
      },
    }
  })
}

function aggregatesFromVotes(
  votes: SimulationReplayVote[],
  options: FixtureOption[],
): OptionAgg[] {
  const byId = new Map<
    string,
    { count: number; confSum: number }
  >()
  for (const o of options) byId.set(o.id, { count: 0, confSum: 0 })
  for (const v of votes) {
    const bucket = byId.get(v.optionId)
    if (!bucket) continue
    bucket.count += 1
    bucket.confSum += v.confidence
  }
  const total = votes.length || 1
  return options.map((o) => {
    const b = byId.get(o.id)!
    return {
      optionId: o.id,
      share: b.count / total,
      meanConfidence: b.count === 0 ? 0 : b.confSum / b.count,
      count: b.count,
    }
  })
}

/** Slightly shifted real aggregates so the fixture has a non-zero divergence. */
function fakeRealAggregates(sim: OptionAgg[]): OptionAgg[] {
  if (sim.length < 2) return sim.map((s) => ({ ...s }))
  const a = sim[0]!
  const b = sim[1]!
  const shift = 0.08
  return sim.map((s, i) => {
    if (i === 0) {
      return {
        ...s,
        share: Math.max(0, s.share - shift),
        meanConfidence: Math.min(10, s.meanConfidence + 1),
        count: Math.max(0, s.count - 8),
      }
    }
    if (i === 1) {
      return {
        ...s,
        share: s.share + shift,
        meanConfidence: Math.max(1, s.meanConfidence - 1),
        count: s.count + 8,
      }
    }
    return { ...s }
  })
}

function buildPayload(): SimulationReplayPayload {
  const rand = mulberry32(0x51f1f17) // fixed seed — stable fixture output
  const personas = buildFixturePersonas(rand)
  const options = buildFixtureOptions()
  const votes = buildVotes(personas, options, rand)
  // Ensure ascending sequenceIndex (buildVotes already assigns 0..n-1 in order)
  votes.sort((a, b) => a.sequenceIndex - b.sequenceIndex)

  const simAggregates = aggregatesFromVotes(votes, options)
  const realAggregates = fakeRealAggregates(simAggregates)
  const scores = computeDivergence(simAggregates, realAggregates)

  const pulseId = '00000000-0000-4000-8000-00000000f001'
  const runId = '00000000-0000-4000-8000-00000000f002'

  return {
    isFixture: true,
    run: {
      id: runId,
      pulseId,
      status: 'complete',
      mode: 'batch',
      model: MODEL,
      personaCount: PERSONA_COUNT,
      completedAt: '2026-09-01T12:00:00.000Z',
      divergenceIndex: scores.index,
      divergenceMeta: {
        ...scores,
        computedAt: '2026-09-01T12:00:00.000Z',
      },
      isFixture: true,
    },
    pulse: {
      id: pulseId,
      question: 'FIXTURE — ¿Cuál debería ser la prioridad en tu colonia?',
      closesAt: '2026-09-15T00:00:00.000Z',
      status: 'closed',
      options,
    },
    votes,
    simAggregates,
    realAggregates,
  }
}

function writeFixture(outPath: string): void {
  const payload = buildPayload()
  mkdirSync(resolve(outPath, '..'), { recursive: true })
  const doc = {
    _comment:
      'FIXTURE — Visor de simulación Task 1. Not real citizen or model output. AGEB codes use FIX- prefix. Safe for Task 3 viewer work before the live API exists.',
    _fixture: true,
    _version: FIXTURE_VERSION,
    ...payload,
  }
  writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
  console.log(
    `Wrote FIXTURE replay payload (${payload.votes.length} votes) → ${outPath}`,
  )
  console.log(
    `  divergence index=${payload.run.divergenceIndex?.toFixed(2)} (fixture)`,
  )
}

async function seedDatabase(pulseId: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
    )
    process.exit(1)
  }

  const { createAdminClient } = await import('../lib/supabase-admin')
  const admin = createAdminClient()

  // Read Pulse + options only. Never write to prediction_markets / market_outcomes
  // vote counters / market_votes / señales.
  const { data: market, error: marketErr } = await admin
    .from('prediction_markets')
    .select('id, title, status, resolution_date, is_pulse')
    .eq('id', pulseId)
    .maybeSingle()

  if (marketErr || !market) {
    console.error(`Pulse not found: ${pulseId}`, marketErr?.message)
    process.exit(1)
  }

  const { data: outcomes, error: outErr } = await admin
    .from('market_outcomes')
    .select('id, label, sort_order')
    .eq('market_id', pulseId)
    .order('sort_order', { ascending: true })

  if (outErr || !outcomes || outcomes.length < 2) {
    console.error('Pulse needs ≥2 market_outcomes', outErr?.message)
    process.exit(1)
  }

  const rand = mulberry32(0x51db01)
  const personas = buildFixturePersonas(rand)

  // Upsert fixture personas by persona_key (idempotent re-runs).
  const personaRows = personas.map((p) => ({
    id: p.id,
    version: FIXTURE_VERSION,
    alcaldia: p.alcaldia,
    colonia: p.colonia,
    age: p.age,
    gender: p.sex,
    education: p.education,
    occupation: p.occupation,
    income_band: p.nseBand ?? 'C',
    household: `FIXTURE household size ${p.householdSize ?? 1}`,
    transport_mode: 'FIXTURE',
    media_diet: ['FIXTURE'],
    values_profile: null,
    persona_narrative: p.personaSummary,
    persona_key: p.personaKey,
    ageb_code: p.agebCode,
    centroid_lat: p.centroidLat,
    centroid_lng: p.centroidLng,
    nse_band: p.nseBand,
    household_size: p.householdSize,
    active: true,
    grounding: p.grounding ?? null,
  }))

  // Delete prior fixture personas/runs for this version to keep re-runs clean.
  // Only touches simulation_* tables.
  const { data: priorRuns } = await admin
    .from('simulation_runs')
    .select('id')
    .eq('market_id', pulseId)
    .eq('is_fixture', true)

  if (priorRuns && priorRuns.length > 0) {
    const ids = priorRuns.map((r) => r.id)
    await admin.from('simulation_votes').delete().in('run_id', ids)
    await admin.from('simulation_runs').delete().in('id', ids)
  }

  await admin.from('simulation_personas').delete().eq('version', FIXTURE_VERSION)

  const { error: personaErr } = await admin
    .from('simulation_personas')
    .insert(personaRows)
  if (personaErr) {
    console.error('Failed to insert fixture personas:', personaErr.message)
    process.exit(1)
  }

  const options: FixtureOption[] = outcomes.map((o, i) => ({
    id: o.id,
    label: o.label,
    order: o.sort_order ?? i,
  }))

  // Rebuild votes against REAL option ids for this pulse.
  const votes = buildVotes(personas, options, rand)
  const simAggregates = aggregatesFromVotes(votes, options)

  const now = new Date().toISOString()
  const { data: run, error: runErr } = await admin
    .from('simulation_runs')
    .insert({
      market_id: pulseId,
      persona_version: FIXTURE_VERSION,
      model: MODEL,
      prompt_version: PROMPT_VERSION,
      n_agents: PERSONA_COUNT,
      status: 'complete',
      mode: 'batch',
      temperature: null,
      started_at: now,
      completed_at: now,
      aggregates: {
        option_shares: Object.fromEntries(
          simAggregates.map((a) => [a.optionId, a.share]),
        ),
        avg_confidence_by_option: Object.fromEntries(
          simAggregates.map((a) => [a.optionId, a.meanConfidence]),
        ),
        confidence_weighted_shares: Object.fromEntries(
          simAggregates.map((a) => [a.optionId, a.share]),
        ),
        completion_rate: 1,
      },
      divergence_index: null,
      divergence_meta: null,
      notes: 'FIXTURE — seed-simulation-fixture.ts. Not a real calibration run.',
      is_fixture: true,
      is_brand_pretest: false,
      question_override: null,
      revealed_at: null,
    })
    .select('id')
    .single()

  if (runErr || !run) {
    console.error('Failed to insert fixture run:', runErr?.message)
    process.exit(1)
  }

  const labelById = new Map(options.map((o) => [o.id, o.label]))
  const voteRows = votes.map((v) => {
    const persona = personas.find((p) => p.personaKey === v.persona.personaKey)!
    return {
      run_id: run.id,
      persona_id: persona.id,
      option_chosen: labelById.get(v.optionId) ?? v.optionId,
      option_id: v.optionId,
      confidence: v.confidence,
      reasoning: v.reasoning,
      reasoning_es: v.reasoning,
      sequence_index: v.sequenceIndex,
      latency_ms: 50 + Math.floor(mulberry32(v.sequenceIndex)() * 200),
      raw_response: { fixture: true },
    }
  })

  // Insert in chunks to stay under payload limits.
  const CHUNK = 50
  for (let i = 0; i < voteRows.length; i += CHUNK) {
    const slice = voteRows.slice(i, i + CHUNK)
    const { error: voteErr } = await admin.from('simulation_votes').insert(slice)
    if (voteErr) {
      console.error('Failed to insert fixture votes:', voteErr.message)
      process.exit(1)
    }
  }

  console.log('FIXTURE run seeded (simulation_* only — no real vote writes).')
  console.log(`  pulse:  ${pulseId} (${market.title})`)
  console.log(`  run:    ${run.id}`)
  console.log(`  votes:  ${voteRows.length} (sequence_index 0..${voteRows.length - 1}, shuffled)`)
  console.log(`  flag:   NEXT_PUBLIC_SIM_VIEWER_ENABLED is still default-off`)
}

function printHelp(): void {
  console.log(`Usage:
  npx tsx scripts/seed-simulation-fixture.ts --write-fixture [--out path]
  npx tsx scripts/seed-simulation-fixture.ts --pulse-id <uuid>

FIXTURE only. Never writes real votes. Requires migration 266 for --pulse-id.
`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.length === 0) {
    printHelp()
    process.exit(args.length === 0 ? 1 : 0)
  }

  if (args.includes('--write-fixture')) {
    const outIdx = args.indexOf('--out')
    const out =
      outIdx >= 0 && args[outIdx + 1]
        ? resolve(args[outIdx + 1]!)
        : resolve(process.cwd(), 'fixtures/simulation-run.json')
    writeFixture(out)
    return
  }

  const pulseIdx = args.indexOf('--pulse-id')
  if (pulseIdx >= 0 && args[pulseIdx + 1]) {
    await seedDatabase(args[pulseIdx + 1]!)
    return
  }

  printHelp()
  process.exit(1)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
