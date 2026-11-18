/**
 * Deterministic fictional matter catalogue for the demo board scale (B6 F3).
 * Never use a real firm catalogue. Counts match the prospect footprint weights.
 */

export type FictionalCatalogueMatter = {
  id: string
  stateCode: string
  stateName: string
  courtName: string
  expedienteNumber: string
  juicio: string
  secretaria: string | null
  partyName: string
  partyNameVariants: string[]
  clientKey: string
}

/** Prospect footprint (~400 matters; ~250 Ciudad de México). */
export const FICTIONAL_MATTER_WEIGHTS: Readonly<Record<string, number>> = {
  'Ciudad de México': 250,
  'Estado de México': 33,
  Guanajuato: 18,
  Querétaro: 14,
  Chihuahua: 11,
  Jalisco: 10,
  'Nuevo León': 9,
  Coahuila: 6,
  'Quintana Roo': 6,
  Tabasco: 6,
  Chiapas: 5,
  Sonora: 5,
  Puebla: 5,
  Tamaulipas: 5,
  Hidalgo: 3,
  Morelos: 2,
  Michoacán: 2,
  Yucatán: 2,
  Durango: 2,
  'Baja California': 1,
  'Baja California Sur': 1,
  Guerrero: 1,
  Aguascalientes: 1,
  Oaxaca: 1,
}

const STATE_META: Record<string, { code: string; courts: string[] }> = {
  'Ciudad de México': {
    code: 'CDMX',
    courts: [
      'Trigésimo Primero Civil de Proceso Oral',
      'Trigésimo Segundo Civil de Proceso Oral',
      'Quincuagésimo Civil',
      'Juzgado Décimo Primero Civil',
      'Juzgado Cuarto de lo Mercantil',
      'Juzgado Primero Familiar de Proceso Oral',
    ],
  },
  'Estado de México': {
    code: 'MEX',
    courts: [
      'Juzgado Primero Civil Toluca',
      'Juzgado Segundo Civil de Proceso Oral Toluca',
      'Juzgado Primero Mercantil Toluca',
    ],
  },
  Guanajuato: {
    code: 'GTO',
    courts: ['Juzgado Primero Civil León', 'Juzgado Segundo Civil León'],
  },
  Querétaro: {
    code: 'QRO',
    courts: [
      'Juzgado Primero Civil de Querétaro',
      'Juzgado Segundo Familiar de Querétaro',
      'Juzgado Primero Mercantil de Querétaro',
    ],
  },
  Chihuahua: {
    code: 'CHIH',
    courts: ['Juzgado Primero Civil Chihuahua', 'Juzgado Segundo Civil Chihuahua'],
  },
  Jalisco: {
    code: 'JAL',
    courts: [
      'Juzgado Primero de lo Civil — Ciudad Judicial',
      'Juzgado Segundo Mercantil — Ciudad Judicial',
    ],
  },
  'Nuevo León': {
    code: 'NL',
    courts: ['Juzgado Primero Civil Monterrey', 'Juzgado Segundo Civil Monterrey'],
  },
  Coahuila: { code: 'COAH', courts: ['Juzgado Primero Civil Saltillo'] },
  'Quintana Roo': { code: 'QROO', courts: ['Juzgado Primero Civil Cancún'] },
  Tabasco: { code: 'TAB', courts: ['Juzgado Primero Civil Villahermosa'] },
  Chiapas: { code: 'CHIS', courts: ['Juzgado Primero Civil Tuxtla'] },
  Sonora: { code: 'SON', courts: ['Juzgado Primero Civil Hermosillo'] },
  Puebla: { code: 'PUE', courts: ['Juzgado Primero Civil Puebla'] },
  Tamaulipas: { code: 'TAMPS', courts: ['Juzgado Primero Civil Tampico'] },
  Hidalgo: { code: 'HGO', courts: ['Juzgado Primero Civil Pachuca'] },
  Morelos: { code: 'MOR', courts: ['Juzgado Primero Civil Cuernavaca'] },
  Michoacán: { code: 'MICH', courts: ['Juzgado Primero Civil Morelia'] },
  Yucatán: { code: 'YUC', courts: ['Juzgado Primero Civil Mérida'] },
  Durango: { code: 'DGO', courts: ['Juzgado Primero Civil Durango'] },
  'Baja California': { code: 'BC', courts: ['Juzgado Primero Civil Tijuana'] },
  'Baja California Sur': { code: 'BCS', courts: ['Juzgado Primero Civil La Paz'] },
  Guerrero: { code: 'GRO', courts: ['Juzgado Primero Civil Acapulco'] },
  Aguascalientes: { code: 'AGS', courts: ['Juzgado Primero Civil Aguascalientes'] },
  Oaxaca: { code: 'OAX', courts: ['Juzgado Primero Civil Oaxaca'] },
}

const CLIENTS = [
  {
    key: 'nexora',
    name: 'Nexora Pagos, S.A.P.I. de C.V.',
    variants: ['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
  },
  {
    key: 'farma',
    name: 'Distribuidora Farma Sierra, S.A. de C.V.',
    variants: ['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
  },
  {
    key: 'viento',
    name: 'Viento del Istmo Energía, S.A.P.I. de C.V.',
    variants: ['Viento del Istmo Energía, S.A.P.I. de C.V.', 'Viento del Istmo'],
  },
  {
    key: 'aduanas',
    name: 'Agencia Aduanal Delta del Pacífico, S.C.',
    variants: ['Agencia Aduanal Delta del Pacífico, S.C.', 'Delta del Pacífico'],
  },
  {
    key: 'fondo',
    name: 'Fondo Pedregal Inmuebles, S.A. de C.V.',
    variants: ['Fondo Pedregal Inmuebles, S.A. de C.V.', 'Fondo Pedregal'],
  },
  {
    key: 'alim',
    name: 'Alimentos del Bajío Integrados, S.A. de C.V.',
    variants: ['Alimentos del Bajío Integrados, S.A. de C.V.', 'Alimentos del Bajío'],
  },
] as const

const JUICIOS = ['Oral Merc.', 'Ejec. Merc.', 'Ord. Merc.', 'Oral Civ.', 'Ejec. Civ.'] as const

const ORDINAL_CDMX = [
  'Primero',
  'Segundo',
  'Tercero',
  'Cuarto',
  'Quinto',
  'Sexto',
  'Séptimo',
  'Octavo',
  'Noveno',
  'Décimo',
  'Décimo Primero',
  'Décimo Segundo',
  'Décimo Tercero',
  'Décimo Cuarto',
  'Décimo Quinto',
  'Vigésimo',
  'Vigésimo Primero',
  'Trigésimo',
  'Trigésimo Primero',
  'Trigésimo Segundo',
  'Cuadragésimo',
  'Quincuagésimo',
] as const

function pad3(n: number): string {
  return String(n).padStart(3, '0')
}

function courtFor(stateName: string, index: number): string {
  const meta = STATE_META[stateName]
  if (!meta) return `Juzgado Civil de ${stateName}`
  if (stateName === 'Ciudad de México') {
    const ordinal = ORDINAL_CDMX[index % ORDINAL_CDMX.length]!
    const kind = index % 3 === 0 ? 'Civil de Proceso Oral' : index % 3 === 1 ? 'Civil' : 'Mercantil'
    return `Juzgado ${ordinal} ${kind}`
  }
  return meta.courts[index % meta.courts.length]!
}

/** Deterministic catalogue — same output every call. */
export function generateFictionalCatalogue(): FictionalCatalogueMatter[] {
  const rows: FictionalCatalogueMatter[] = []
  let global = 0
  const states = Object.keys(FICTIONAL_MATTER_WEIGHTS).sort((a, b) =>
    a.localeCompare(b, 'es-MX')
  )

  for (const stateName of states) {
    const count = FICTIONAL_MATTER_WEIGHTS[stateName] ?? 0
    const meta = STATE_META[stateName]
    const code = meta?.code ?? stateName.slice(0, 4).toUpperCase()
    for (let i = 0; i < count; i++) {
      global += 1
      const client = CLIENTS[global % CLIENTS.length]!
      const year = 2024 + (global % 3)
      const num = 100 + ((global * 17) % 900)
      const juicio = JUICIOS[global % JUICIOS.length]!
      // Secretaría often empty in prospect-style lists.
      const secretaria = global % 5 === 0 ? String((global % 3) + 1) : null
      rows.push({
        id: `fic-cat-${code.toLowerCase()}-${pad3(i + 1)}`,
        stateCode: code,
        stateName,
        courtName: courtFor(stateName, i),
        expedienteNumber: `${num}/${year}`,
        juicio,
        secretaria,
        partyName: client.name,
        partyNameVariants: [...client.variants],
        clientKey: client.key,
      })
    }
  }

  return rows
}

let cached: FictionalCatalogueMatter[] | null = null

export function getFictionalCatalogue(): FictionalCatalogueMatter[] {
  if (!cached) cached = generateFictionalCatalogue()
  return cached
}

export function fictionalMatterCountByState(): Record<string, number> {
  return { ...FICTIONAL_MATTER_WEIGHTS }
}

export function fictionalMatterCountForState(stateName: string): number {
  return FICTIONAL_MATTER_WEIGHTS[stateName] ?? 0
}

export function fictionalTotalMatterCount(): number {
  return Object.values(FICTIONAL_MATTER_WEIGHTS).reduce((a, b) => a + b, 0)
}
