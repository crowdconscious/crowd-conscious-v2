/**
 * Build fixtures/simulation-run.fixture.json from data/personas.cdmx-v1.generated.json.
 *
 * FIXTURE ONLY — numbers are invented for the Visor demo. Do not present as
 * real Pulse results. Replay order is shuffled (not grouped by option).
 *
 * Each of the 150 personas gets a unique display name, uses its source age /
 * colonia / NSE, and a distinct one-sentence reasoning in that persona's register.
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
import type { PersonaGrounding } from '../../types/simulation'

type SourcePersona = {
  alcaldia: string
  colonia: string | null
  age: number
  gender: string
  education: string
  occupation: string
  income_band: string
  household: string | null
  persona_narrative: string
}

type SourceFile = {
  personas: SourcePersona[]
}

/** 90+ masculine given names — enough for unique pairing with surnames. */
const MASCULINE_NAMES = [
  'Tadeo', 'Mateo', 'Santiago', 'Diego', 'Emiliano', 'Sebastián', 'Leonardo',
  'Gael', 'Rodrigo', 'Iker', 'Bruno', 'Andrés', 'Joaquín', 'Tomás', 'Nicolás',
  'Fernando', 'Luis', 'Carlos', 'Miguel', 'Javier', 'Rafael', 'Ángel', 'Héctor',
  'Iván', 'Óscar', 'Pablo', 'Daniel', 'Adrián', 'Mauricio', 'Ernesto', 'Eduardo',
  'Ricardo', 'Alberto', 'Francisco', 'Guillermo', 'Manuel', 'Pedro', 'José',
  'Antonio', 'Jorge', 'Roberto', 'Sergio', 'Martín', 'Felipe', 'Hugo', 'Samuel',
  'Cristian', 'Esteban', 'Ramiro', 'Ignacio', 'Álvaro', 'Vicente', 'Enrique',
  'Arturo', 'César', 'Raúl', 'Gustavo', 'Omar', 'Lorenzo', 'Maximiliano',
  'Braulio', 'Clemente', 'Damián', 'Elias', 'Fabián', 'Gerardo', 'Ismael',
  'Julián', 'Kevin', 'Leonel', 'Marcelo', 'Néstor', 'Octavio', 'Patricio',
  'Quintín', 'René', 'Saúl', 'Teodoro', 'Ulises', 'Valentín', 'Wilfredo',
  'Xavier', 'Yahir', 'Zacarías', 'Axel', 'Benítez', 'Camilo', 'Dario',
  'Ezequiel', 'Federico',
] as const

const FEMININE_NAMES = [
  'Valentina', 'Sofía', 'Regina', 'Camila', 'Ximena', 'Renata', 'Martina',
  'Isabella', 'Victoria', 'Daniela', 'Fernanda', 'Paula', 'Andrea', 'Lucía',
  'Mariana', 'Alejandra', 'Natalia', 'Jimena', 'Carolina', 'Elena', 'Diana',
  'Patricia', 'Gabriela', 'Claudia', 'Alicia', 'Rosa', 'Carmen', 'Teresa',
  'Beatriz', 'Inés', 'Ana', 'María', 'Laura', 'Paulina', 'Abril', 'Denise',
  'Estefanía', 'Fátima', 'Gloria', 'Helena', 'Itzel', 'Julia', 'Karla',
  'Leticia', 'Mónica', 'Nadia', 'Olga', 'Pilar', 'Rebeca', 'Silvia',
  'Tamara', 'Úrsula', 'Verónica', 'Wendy', 'Yesenia', 'Zulema', 'Adriana',
  'Brenda', 'Cecilia', 'Dolores', 'Elisa', 'Francisca', 'Guadalupe', 'Hilda',
  'Irene', 'Josefina', 'Katia', 'Lorena', 'Magdalena', 'Norma', 'Ofelia',
  'Paloma', 'Rocío', 'Susana', 'Tania', 'Violeta', 'Xóchitl', 'Yolanda',
  'Zoe', 'Amparo', 'Bárbara', 'Concepción', 'Dulce', 'Esperanza', 'Flor',
  'Graciela', 'Haydeé', 'Ivonne', 'Jessica',
] as const

const SURNAMES = [
  'García', 'Hernández', 'López', 'Martínez', 'González', 'Pérez', 'Rodríguez',
  'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz',
  'Morales', 'Reyes', 'Gutiérrez', 'Ortiz', 'Ramos', 'Chávez', 'Ruiz', 'Mendoza',
  'Aguilar', 'Vargas', 'Castillo', 'Jiménez', 'Moreno', 'Romero', 'Herrera',
  'Medina', 'Aguirre', 'Navarro', 'Ríos', 'Salazar', 'Vega', 'Campos', 'Cortés',
  'Guerrero', 'Soto', 'Contreras', 'Silva', 'Núñez', 'Molina', 'Delgado',
  'Pacheco', 'Estrada', 'Cervantes', 'Mejía', 'Sandoval', 'Bautista', 'Ibarra',
  'Cabrera', 'Miranda', 'Peña', 'León', 'Domínguez', 'Velázquez', 'Fuentes',
  'Carrillo', 'Solís', 'Rangel', 'Orozco', 'Zamora', 'Benítez', 'Acosta',
  'Ponce', 'Lara', 'Valdez', 'Márquez', 'Espinoza', 'Castañeda', 'Galván',
  'Quintero', 'Rosales', 'Tapia', 'Avalos', 'Mercado', 'Palacios',
] as const

const OPTIONS = [
  { id: 'opt-agua', label: 'Agua', order: 0, targetShare: 0.26 },
  { id: 'opt-seguridad', label: 'Seguridad', order: 1, targetShare: 0.16 },
  { id: 'opt-movilidad', label: 'Movilidad', order: 2, targetShare: 0.4 },
  { id: 'opt-espacio', label: 'Espacio público', order: 3, targetShare: 0.18 },
] as const

/** Extra colonias so the fixture spans more neighbourhoods than the source sample. */
const COLONIAS_MH = [
  'Polanco', 'Anáhuac', 'Tacuba', 'Popotla', 'San Miguel Chapultepec',
  'Lomas de Sotelo', 'Argentina', 'Verónica Anzures', 'Irrigación',
  'Ampliación Granada', 'Escandón', 'Observatorio', 'Daniel Garza',
  'Un Hogar para Nosotros', 'Nextitla', 'Tlaxpana',
] as const

const COLONIAS_CQ = [
  'Condesa', 'Roma Norte', 'Roma Sur', 'Doctores', 'Centro', 'Juárez',
  'Buenavista', 'San Rafael', 'Santa María la Ribera', 'Guerrero',
  'Tabacalera', 'Cuauhtémoc', 'Hipódromo', 'Narvarte', 'Obrera',
  'Morelos', 'Peralvillo', 'Asturias', 'Vista Alegre', 'Algarín',
] as const

/** Map source income bands onto the AMAI set Francisco asked for. */
function normalizeNse(band: string): string {
  if (band === 'D/E' || band === 'E') return 'D'
  return band
}

/**
 * Derive a household size (1–7) from the free-text household field, with a
 * seeded fallback so every fixture persona has a count for the inspector.
 */
function householdSizeFromText(
  household: string | null,
  rng: ReturnType<typeof createSeededRng>
): number {
  if (household) {
    const lower = household.toLowerCase()
    const nums = lower.match(/\b([1-9]|1[0-2])\b/g)
    if (nums && nums.length > 0) {
      // Prefer counts of children / roommates mentioned, + self/partner heuristics.
      const mentioned = nums.map(Number)
      const maxMentioned = Math.max(...mentioned)
      if (/solo|sola/.test(lower)) return 1
      if (/pareja|espos[oa]|compañer/.test(lower)) {
        return Math.min(7, Math.max(2, maxMentioned + 1))
      }
      if (/roommate|compañer|amigo|prima|primo/.test(lower)) {
        return Math.min(7, maxMentioned + 1)
      }
      return Math.min(7, Math.max(1, maxMentioned))
    }
    if (/solo|sola/.test(lower)) return 1
    if (/pareja|espos[oa]/.test(lower)) return 2
  }
  return Math.round(rng.nextFloat(1, 5))
}

/**
 * Fixture-only grounding. Real source names/URLs are fine; every numeric
 * marginal is invented and marked `isExample: true` so the inspector never
 * presents these as real INEGI figures.
 */
function buildExampleGrounding(args: {
  agebCode: string
  age: number
  education: string
  householdSize: number
  nseBand: string
  sex: string
  rng: ReturnType<typeof createSeededRng>
}): PersonaGrounding {
  const { agebCode, age, education, householdSize, nseBand, sex, rng } = args
  const ageBand =
    age < 30 ? '18–29' : age < 45 ? '30–44' : age < 60 ? '45–59' : '60+'
  const ageShare = Math.round(rng.nextFloat(0.14, 0.32) * 100) / 100
  const eduShare = Math.round(rng.nextFloat(0.18, 0.42) * 100) / 100
  const nseShare = Math.round(rng.nextFloat(0.12, 0.38) * 100) / 100
  const sexShare = Math.round(rng.nextFloat(0.45, 0.55) * 100) / 100
  const meanHh = Math.round(rng.nextFloat(2.1, 4.2) * 10) / 10
  const population = Math.round(rng.nextFloat(1800, 6200))

  return {
    isExample: true,
    sources: [
      {
        name: 'INEGI Censo de Población y Vivienda',
        year: 2020,
        url: 'https://www.inegi.org.mx/programas/ccpv/2020/',
        table: 'AGEB urbana',
      },
      {
        name: 'INEGI ENIGH',
        year: 2022,
        url: 'https://www.inegi.org.mx/programas/enigh/nc/2022/',
        table: 'Ingresos del hogar',
      },
      {
        name: 'AMAI NSE',
        year: 2022,
        url: 'https://www.amai.org/NSE/',
        table: 'Regla de asignación',
      },
    ],
    ageb: {
      code: agebCode,
      population,
      marginals: [
        {
          label: `Grupo de edad ${ageBand}`,
          value: `${Math.round(ageShare * 100)}%`,
          share: ageShare,
        },
        {
          label: `Sexo (${sex})`,
          value: `${Math.round(sexShare * 100)}%`,
          share: sexShare,
        },
        {
          label: `Escolaridad (${education})`,
          value: `${Math.round(eduShare * 100)}%`,
          share: eduShare,
        },
        {
          label: 'Tamaño medio del hogar',
          value: `${meanHh} pers.`,
        },
        {
          label: `NSE ${nseBand} (AMAI)`,
          value: `${Math.round(nseShare * 100)}%`,
          share: nseShare,
        },
        {
          label: 'Hogar de esta persona',
          value: `${householdSize} pers.`,
        },
      ],
    },
    method:
      'Se muestreó una celda demográfica a partir de las marginales del AGEB (edad × sexo × escolaridad) y se asignó NSE con la regla AMAI; el resumen narrativo se redactó para esa celda, no para un individuo real.',
  }
}

/**
 * Source personas cluster ~24–68. Stretch onto 18–80 for fixture realism
 * while preserving relative ordering (younger stay younger).
 */
function stretchAge(
  age: number,
  rng: ReturnType<typeof createSeededRng>
): number {
  const minS = 22
  const maxS = 70
  const t = Math.min(1, Math.max(0, (age - minS) / (maxS - minS)))
  const mapped = 18 + t * (80 - 18) + rng.nextFloat(-1.5, 1.5)
  return Math.round(Math.min(80, Math.max(18, mapped)))
}

function pickColonia(
  alcaldia: string,
  fallback: string | null,
  index: number,
  rng: ReturnType<typeof createSeededRng>
): string {
  const pool = alcaldia.includes('Miguel') ? COLONIAS_MH : COLONIAS_CQ
  // Prefer source colonia when present; otherwise rotate the pool.
  if (fallback && fallback.length > 2 && rng.next() < 0.55) return fallback
  return pool[(index + rng.nextInt(0, pool.length - 1)) % pool.length]!
}

type Register = 'young' | 'mid' | 'elder'

function registerForAge(age: number): Register {
  if (age < 32) return 'young'
  if (age < 55) return 'mid'
  return 'elder'
}

/**
 * Build a unique one-liner per vote, keyed by option + register + colonia +
 * occupation crumbs so the stream never repeats the same sentence.
 */
function buildReasoning(
  optionId: string,
  p: SourcePersona,
  seq: number,
  rng: ReturnType<typeof createSeededRng>
): string {
  const colonia = p.colonia ?? p.alcaldia
  const reg = registerForAge(p.age)
  const job = p.occupation.split(/\s+/)[0]?.toLowerCase() ?? 'trabajo'

  const agua: Record<Register, string[]> = {
    young: [
      `En ${colonia} el tinaco no da para la semana y ya pedí pipa dos veces.`,
      `Sin presión a las 7 no me da tiempo de bañarme antes de salir a ${job}.`,
      `La fuga de la esquina lleva meses y en ${colonia} nadie viene.`,
      `El agua llega con olor raro; en el depa de ${colonia} ya no confiamos.`,
    ],
    mid: [
      `Con la familia en ${colonia} el tinaco se acaba a media semana.`,
      `Las mañanas sin presión complican a toda la casa en ${colonia}.`,
      `Pagamos pipa cada mes en ${colonia} y eso ya no es normal.`,
      `Hay fugas a la vista desde hace años por ${colonia} y no las tapan.`,
    ],
    elder: [
      `A mi edad no puedo estar cargando cubetas en ${colonia}.`,
      `Antes el agua llegaba bien; en ${colonia} ya no es igual.`,
      `El tinaco viejo no aguanta el verano aquí en ${colonia}.`,
      `Sin agua segura en ${colonia} uno se siente desprotegido.`,
    ],
  }

  const seguridad: Record<Register, string[]> = {
    young: [
      `De noche en ${colonia} ya no camino sola(o) como antes.`,
      `El parque de ${colonia} se puso pesado después de las ocho.`,
      `Falta luz en la calle donde vivo en ${colonia}.`,
      `En dos años ${colonia} cambió y se siente más tenso.`,
    ],
    mid: [
      `Con los niños no me siento tranquilo(a) en ${colonia} de noche.`,
      `La colonia ${colonia} cambió mucho; hay que cuidarse más.`,
      `Falta vigilancia cerca del mercado de ${colonia}.`,
      `Varias vecinas de ${colonia} ya no salen después de las 9.`,
    ],
    elder: [
      `Ya no salgo tarde en ${colonia}; me da miedo el regreso.`,
      `Antes ${colonia} era más tranquila; ahora uno se cuida.`,
      `Sin luminarias en mi calle de ${colonia} no se puede caminar.`,
      `A esta edad la seguridad en ${colonia} es lo primero.`,
    ],
  }

  const movilidad: Record<Register, string[]> = {
    young: [
      `El Metrobús a ${colonia} va a tope y pierdo media hora diario.`,
      `Sin ciclovía segura no me arriesgo en ${colonia} con la bici.`,
      `El último tramo a ${colonia} siempre es el más lento.`,
      `Los semáforos por ${colonia} no coordinan y el cruce es un caos.`,
    ],
    mid: [
      `Llegar a ${job} desde ${colonia} me come casi una hora.`,
      `El transporte a ${colonia} está saturado de lunes a viernes.`,
      `Sin mejor conexión en ${colonia} pierdo tiempo con la familia.`,
      `El tráfico hacia ${colonia} ya no se aguanta en hora pico.`,
    ],
    elder: [
      `Caminar al Metro desde ${colonia} se me hace largo y cansado.`,
      `Necesito transporte más accesible cerca de ${colonia}.`,
      `Subirme al camión lleno en ${colonia} ya no es opción.`,
      `Si mejoran rutas en ${colonia}, uno sale más a gusto.`,
    ],
  }

  const espacio: Record<Register, string[]> = {
    young: [
      `En ${colonia} no hay dónde sentarse sin pagar un café.`,
      `Un parque bien cuidado en ${colonia} cambia el ánimo de la cuadra.`,
      `Los juegos de ${colonia} están oxidados desde hace años.`,
      `Falta sombra y bancas en la plaza cerca de ${colonia}.`,
    ],
    mid: [
      `Mis hijos no tienen un parque decente cerca de ${colonia}.`,
      `Falta espacio verde usable en ${colonia}, no solo concreto.`,
      `La plaza de ${colonia} podría ser punto de encuentro si la cuidan.`,
      `Sin bancas ni sombra en ${colonia} no hay vida de barrio.`,
    ],
    elder: [
      `Necesito bancas y sombra para salir a tomar aire en ${colonia}.`,
      `El parque de ${colonia} está abandonado y ya no voy.`,
      `Un espacio público digno en ${colonia} nos haría bien a todos.`,
      `Antes había más áreas comunes; en ${colonia} se perdieron.`,
    ],
  }

  const pools: Record<string, Record<Register, string[]>> = {
    'opt-agua': agua,
    'opt-seguridad': seguridad,
    'opt-movilidad': movilidad,
    'opt-espacio': espacio,
  }

  const pool = pools[optionId]?.[reg] ?? agua.mid
  const idx = (seq + rng.nextInt(0, pool.length - 1)) % pool.length
  return pool[idx]!
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
      count: shareOverride ? Math.round(share * votes.length) : count,
    }
  })
}

function assignUniqueNames(
  personas: SourcePersona[],
  rng: ReturnType<typeof createSeededRng>
): string[] {
  const masc = seededShuffle([...MASCULINE_NAMES], rng)
  const fem = seededShuffle([...FEMININE_NAMES], rng)
  const surnames = seededShuffle([...SURNAMES], rng)
  let mi = 0
  let fi = 0
  const used = new Set<string>()
  return personas.map((p, i) => {
    const isFem = p.gender === 'femenino'
    let given: string
    if (isFem) {
      given = fem[fi % fem.length]!
      fi += 1
    } else {
      given = masc[mi % masc.length]!
      mi += 1
    }
    // First+surname keeps 150 unique even when given names recycle.
    let display = `${given} ${surnames[i % surnames.length]!}`
    let n = 2
    while (used.has(display)) {
      display = `${given} ${surnames[(i + n) % surnames.length]!}`
      n += 1
    }
    used.add(display)
    // Feed shows given name; keep uniqueness via full displayName in data,
    // but for the stream header use "Given" only when unique among firsts,
    // otherwise "Given S."
    return display
  })
}

function main(): void {
  const root = resolve(process.cwd())
  const sourcePath = resolve(root, 'data/personas.cdmx-v1.generated.json')
  const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as SourceFile
  if (source.personas.length < 150) {
    throw new Error(`Expected ≥150 personas, got ${source.personas.length}`)
  }

  const rng = createSeededRng('fixture-simulation-run-v2')
  // Shuffle source order so ages/NSE/colonias interleave in replay (not
  // demographic blocks of 26-year-old A/B first).
  const panel = seededShuffle(source.personas.slice(0, 150), rng)
  const displayNames = assignUniqueNames(panel, createSeededRng('fixture-names-v2'))

  const counts = allocateOptionCounts(150)
  const optionBag: string[] = []
  counts.forEach((c, i) => {
    for (let k = 0; k < c; k++) optionBag.push(OPTIONS[i]!.id)
  })
  const shuffledOptions = seededShuffle(optionBag, rng)

  const reasonSeen = new Set<string>()
  const votes: SimulationReplayVote[] = panel.map((p, i) => {
    const optionId = shuffledOptions[i]!
    const fullName = displayNames[i]!
    const [given, surname = 'X'] = fullName.split(' ')
    // Unique in the stream: "Tadeo G." — given names alone would collide.
    const feedName = `${given} ${surname.charAt(0)}.`
    const alcaldiaSlug = slugify(p.alcaldia).slice(0, 2)
    const nse = normalizeNse(p.income_band)
    let age = stretchAge(p.age, rng)
    // Pin extremes so the panel visibly covers 18–80.
    if (i === 0) age = 18
    if (i === 1) age = 80
    const colonia = pickColonia(p.alcaldia, p.colonia, i, rng)
    const personaKey = `${alcaldiaSlug}-${slugify(colonia).slice(0, 8)}-${slugify(nse)}-${String(i).padStart(3, '0')}`

    // Reason against the display colonia/age so copy matches the feed.
    const personaForReason: SourcePersona = { ...p, colonia, age }
    let reasoning = buildReasoning(optionId, personaForReason, i, rng)
    // Guarantee uniqueness with a natural follow-on, not a numeric stamp.
    let guard = 0
    const tails = [
      ` Lo vivo cada semana.`,
      ` En mi cuadra se nota.`,
      ` Ya no aguanto más.`,
      ` Mis vecinos coinciden.`,
      ` Es lo que más urge aquí.`,
      ` Por eso voto así.`,
    ]
    while (reasonSeen.has(reasoning) && guard < tails.length) {
      reasoning = `${buildReasoning(optionId, personaForReason, i + guard + 1, rng)}${tails[guard]!}`
      guard += 1
    }
    if (reasonSeen.has(reasoning)) {
      reasoning = `${reasoning} Hablo desde ${colonia}.`
    }
    reasonSeen.add(reasoning)

    const confidence = Math.round(rng.nextFloat(4.5, 9.8) * 10) / 10
    const agebCode = `09${String(1000 + (i % 80)).padStart(4, '0')}`
    const householdSize = householdSizeFromText(p.household, rng)

    return {
      sequenceIndex: i,
      optionId,
      confidence,
      reasoning,
      persona: {
        personaKey,
        displayName: feedName,
        alcaldia: p.alcaldia,
        colonia,
        agebCode,
        centroidLat: 19.4 + rng.nextFloat(-0.05, 0.05),
        centroidLng: -99.18 + rng.nextFloat(-0.05, 0.05),
        nseBand: nse,
        age,
        sex: p.gender,
        education: p.education,
        householdSize,
        occupation: p.occupation,
        personaSummary: p.persona_narrative,
        grounding: buildExampleGrounding({
          agebCode,
          age,
          education: p.education,
          householdSize,
          nseBand: nse,
          sex: p.gender,
          rng,
        }),
      },
    }
  })

  const first20 = new Set(votes.slice(0, 20).map((v) => v.optionId))
  if (first20.size < 3) {
    throw new Error('Replay order looks grouped by option — aborting')
  }

  const ages = votes.map((v) => v.persona.age)
  const ageMin = Math.min(...ages)
  const ageMax = Math.max(...ages)
  if (ageMin > 20 || ageMax < 75) {
    throw new Error(`Age spread too narrow for fixture: ${ageMin}–${ageMax}`)
  }

  const names = votes.map((v) => v.persona.displayName)
  if (new Set(names).size < 100) {
    throw new Error(`Too few unique given names in feed: ${new Set(names).size}`)
  }
  if (reasonSeen.size !== 150) {
    throw new Error(`Expected 150 unique reasonings, got ${reasonSeen.size}`)
  }

  const simAggregates = buildAggregates(votes)
  const realAggregates = buildAggregates(votes, {
    'opt-agua': 0.22,
    'opt-seguridad': 0.28,
    'opt-movilidad': 0.31,
    'opt-espacio': 0.19,
  })

  const shareScore = 18.4
  const confScore = 12.1
  const divergenceIndex = Math.round(0.6 * shareScore + 0.4 * confScore)

  const mh = votes.filter((v) => v.persona.alcaldia.includes('Miguel')).length
  const cq = votes.filter((v) => v.persona.alcaldia.includes('Cuauht')).length

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
      locationLabel: 'Miguel Hidalgo · Cuauhtémoc',
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
  console.log(
    `Wrote ${outPath} (${votes.length} votes, ages ${ageMin}–${ageMax}, MH=${mh} CQ=${cq}, uniqueReasons=${reasonSeen.size})`
  )
}

main()
