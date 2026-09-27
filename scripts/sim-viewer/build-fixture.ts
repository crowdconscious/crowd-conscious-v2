/**
 * Build fixtures/simulation-run.fixture.json from data/personas.cdmx-v1.generated.json.
 *
 * FIXTURE ONLY — numbers are invented for the Visor demo. Do not present as
 * real Pulse results. Replay order is shuffled (not grouped by option).
 *
 * Run: npx tsx scripts/sim-viewer/build-fixture.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createSeededRng, seededShuffle } from '../../lib/sim-viewer/prng'
import type {
  SimulationOptionAggregate,
  SimulationReplayPayload,
  SimulationReplayVote,
} from '../../types/simulation-replay'

type SourcePersona = {
  alcaldia: string
  colonia: string | null
  age: number
  gender: string
  education: string
  occupation: string
  income_band: string
  persona_narrative: string
}

type SourceFile = {
  personas: SourcePersona[]
}

const MASCULINE_NAMES = [
  'Tadeo', 'Mateo', 'Santiago', 'Diego', 'Emiliano', 'Sebastián', 'Leonardo',
  'Gael', 'Rodrigo', 'Iker', 'Bruno', 'Andrés', 'Joaquín', 'Tomás', 'Nicolás',
  'Fernando', 'Luis', 'Carlos', 'Miguel', 'Javier', 'Rafael', 'Ángel', 'Héctor',
  'Iván', 'Óscar', 'Pablo', 'Daniel', 'Adrián', 'Mauricio', 'Ernesto',
] as const

const FEMININE_NAMES = [
  'Valentina', 'Sofía', 'Regina', 'Camila', 'Ximena', 'Renata', 'Martina',
  'Isabella', 'Victoria', 'Daniela', 'Fernanda', 'Paula', 'Andrea', 'Lucia',
  'Mariana', 'Alejandra', 'Natalia', 'Jimena', 'Carolina', 'Elena', 'Diana',
  'Patricia', 'Gabriela', 'Claudia', 'Alicia', 'Rosa', 'Carmen', 'Teresa',
  'Beatriz', 'Inés',
] as const

const OPTIONS = [
  { id: 'opt-agua', label: 'Agua', order: 0, targetShare: 0.26 },
  { id: 'opt-seguridad', label: 'Seguridad', order: 1, targetShare: 0.16 },
  { id: 'opt-movilidad', label: 'Movilidad', order: 2, targetShare: 0.4 },
  { id: 'opt-espacio', label: 'Espacio público', order: 3, targetShare: 0.18 },
] as const

const REASONING_BY_OPTION: Record<string, string[]> = {
  'opt-agua': [
    'El tinaco se queda corto cada verano y ya no aguanta.',
    'Sin presión en las mañanas no se puede ni bañar la familia.',
    'Hay fugas a la vista y nadie las atiende en años.',
    'El agua llega turbia dos veces por semana desde 2023.',
  ],
  'opt-seguridad': [
    'La colonia cambió mucho en dos años.',
    'Caminar de noche ya no se siente igual que antes.',
    'Falta iluminación en las calles principales.',
    'El parque se puso pesado después de las 8.',
  ],
  'opt-movilidad': [
    'El Metrobús va a tope y el viaje se alarga media hora.',
    'Sin ciclovía segura no me arriesgo con los niños.',
    'Los semáforos no coordinan y el cruce es un caos.',
    'El último tramo a casa siempre es el más lento.',
  ],
  'opt-espacio': [
    'No hay dónde sentarse sin pagar un café.',
    'Los juegos están oxidados desde hace años.',
    'Falta sombra y bancas en la plaza de la esquina.',
    'Un parque bien cuidado cambia el ánimo de la cuadra.',
  ],
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function allocateOptionCounts(n: number): number[] {
  const raw = OPTIONS.map((o) => o.targetShare * n)
  const floors = raw.map((x) => Math.floor(x))
  let rem = n - floors.reduce((a, b) => a + b, 0)
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac)
  const counts = floors.slice()
  for (let k = 0; k < rem; k++) {
    counts[order[k]!.i]! += 1
  }
  return counts
}

function buildAggregates(
  votes: SimulationReplayVote[],
  shareOverride?: Record<string, number>
): SimulationOptionAggregate[] {
  return OPTIONS.map((opt) => {
    const forOpt = votes.filter((v) => v.optionId === opt.id)
    const count = forOpt.length
    const meanConfidence =
      count === 0
        ? 0
        : forOpt.reduce((s, v) => s + v.confidence, 0) / count
    const share =
      shareOverride?.[opt.id] ??
      (votes.length === 0 ? 0 : count / votes.length)
    return {
      optionId: opt.id,
      share,
      meanConfidence: Math.round(meanConfidence * 10) / 10,
      count: shareOverride
        ? Math.round(share * votes.length)
        : count,
    }
  })
}

function main(): void {
  const root = resolve(process.cwd())
  const sourcePath = resolve(root, 'data/personas.cdmx-v1.generated.json')
  const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as SourceFile
  const personas = source.personas
  if (personas.length < 150) {
    throw new Error(`Expected ≥150 personas, got ${personas.length}`)
  }

  const panel = personas.slice(0, 150)
  const rng = createSeededRng('fixture-simulation-run-v1')
  const counts = allocateOptionCounts(150)

  // Build option bag then shuffle — NOT grouped by option in replay order.
  const optionBag: string[] = []
  counts.forEach((c, i) => {
    for (let k = 0; k < c; k++) optionBag.push(OPTIONS[i]!.id)
  })
  const shuffledOptions = seededShuffle(optionBag, rng)

  const votes: SimulationReplayVote[] = panel.map((p, i) => {
    const optionId = shuffledOptions[i]!
    const isFem = p.gender === 'femenino'
    const names = isFem ? FEMININE_NAMES : MASCULINE_NAMES
    const displayName = names[i % names.length]!
    const alcaldiaSlug = slugify(p.alcaldia).slice(0, 2)
    const coloniaSlug = slugify(p.colonia ?? 'x').slice(0, 8)
    const nseSlug = slugify(p.income_band)
    const personaKey = `${alcaldiaSlug}-${coloniaSlug}-${nseSlug}-${String(i).padStart(3, '0')}`
    const reasons = REASONING_BY_OPTION[optionId] ?? ['Prioridad clara para la colonia.']
    const reasoning = reasons[i % reasons.length]!
    // Confidence skewed mid-high like the mock (~7.6 mean)
    const confidence = Math.round((rng.nextFloat(4.5, 9.8)) * 10) / 10

    return {
      sequenceIndex: i,
      optionId,
      confidence,
      reasoning,
      persona: {
        personaKey,
        displayName,
        alcaldia: p.alcaldia,
        colonia: p.colonia,
        agebCode: `09${String(1000 + (i % 80)).padStart(4, '0')}`,
        centroidLat: 19.4 + rng.nextFloat(-0.05, 0.05),
        centroidLng: -99.18 + rng.nextFloat(-0.05, 0.05),
        nseBand: p.income_band,
        age: p.age,
        sex: p.gender,
        education: p.education,
        occupation: p.occupation,
        personaSummary: p.persona_narrative,
      },
    }
  })

  // Verify shuffle: first 20 should not be mono-option
  const first20 = new Set(votes.slice(0, 20).map((v) => v.optionId))
  if (first20.size < 3) {
    throw new Error('Replay order looks grouped by option — aborting')
  }

  const simAggregates = buildAggregates(votes)
  // Real result slightly different so the reveal / divergence has something to show.
  const realAggregates = buildAggregates(votes, {
    'opt-agua': 0.22,
    'opt-seguridad': 0.28,
    'opt-movilidad': 0.31,
    'opt-espacio': 0.19,
  })

  // Rough divergence for the fixture readout (Task 1 owns the real formula).
  const shareScore = 18.4
  const confScore = 12.1
  const divergenceIndex = Math.round(0.6 * shareScore + 0.4 * confScore)

  const payload: SimulationReplayPayload = {
    isFixture: true,
    run: {
      id: 'fixture-run-00000000-0000-4000-8000-000000000001',
      pulseId: 'fixture-pulse-00000000-0000-4000-8000-000000000014',
      status: 'complete',
      mode: 'batch',
      model: 'fixture-model',
      personaCount: 150,
      completedAt: '2026-09-01T12:00:00.000Z',
      divergenceIndex,
      divergenceMeta: {
        shareScore,
        confScore,
        computedAt: '2026-09-01T12:05:00.000Z',
      },
    },
    pulse: {
      id: 'fixture-pulse-00000000-0000-4000-8000-000000000014',
      question: '¿Qué debería priorizar la alcaldía en 2027?',
      closesAt: '2026-09-15T06:00:00.000Z',
      status: 'closed',
      locationLabel: 'Miguel Hidalgo',
      options: OPTIONS.map(({ id, label, order }) => ({ id, label, order })),
    },
    votes,
    simAggregates,
    realAggregates,
  }

  const outDir = resolve(root, 'fixtures')
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, 'simulation-run.fixture.json')
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outPath} (${votes.length} votes, fixture=true)`)
}

main()
