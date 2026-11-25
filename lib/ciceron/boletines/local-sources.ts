/**
 * Static local page scans for demo bulletin hits (CDMX Boletín Judicial).
 * No DB writes — locators are matched by expediente + court on the client/server.
 */

export type HighlightBox = {
  /** Left edge as fraction of image width (0–1). */
  x: number
  /** Top edge as fraction of image height (0–1). */
  y: number
  /** Width as fraction of image width. */
  w: number
  /** Height as fraction of image height. */
  h: number
}

export type LocalBulletinEntryLocator = {
  expediente: string
  /** Substring matched against entry court_name (accent-insensitive). */
  courtMatch: string
  printedPage: number
  imagePath: string
  highlight: HighlightBox
  excerpt: string
}

export type LocalBulletinManifest = {
  sourceKey: string
  bulletinDate: string
  title: string
  bulletinNumber: string
  dateLabelEs: string
  totalPages: number
  officialVisorUrl: string
  officialLandingUrl: string
  entries: LocalBulletinEntryLocator[]
}

const CDMX_2026_11_24_VISOR =
  'https://edigital.poderjudicialcdmx.gob.mx/visor20/L1c2WDh0TXorUkw2dHRlRlRRUnNpeENwSEtFMEt6TFVwTWtnbWs0c1VmZUhaZ3gvV1JWVGRRbktvK3gwbDUrTGkwbm9iSklSdDNqZStEUnVhYTJDV2JuS1RGNitPdUxMMGsrUFpWWjBKYTM0UjVSclBQemV4ZkZmREM1c0FsQklkd3F4RCtqRGJjL2dzQWxqR3pRckEzOWF4U1BsMlRLRjlJZU5xcFg4S0pjWWFUaXVsT2ZTNGlkZGZBQkFJUlE9'

/** Demo scans for Boletín Judicial CDMX No. 199 (24 nov 2026). */
export const LOCAL_BOLETIN_CDMX_2026_11_24: LocalBulletinManifest = {
  sourceKey: 'cdmx_boletin_pj',
  bulletinDate: '2026-11-24',
  title: 'Boletín Judicial CDMX',
  bulletinNumber: '199',
  dateLabelEs: '24 nov 2026',
  totalPages: 362,
  officialVisorUrl: CDMX_2026_11_24_VISOR,
  officialLandingUrl: 'https://poderjudicialcdmx.gob.mx/consulta-boletin/',
  entries: [
    {
      expediente: '87/2023',
      courtMatch: 'Trigésimo Segundo de lo Civil',
      printedPage: 78,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-24/p078.webp',
      highlight: { x: 0.502, y: 0.5609, w: 0.4471, h: 0.0279 },
      excerpt:
        'SECRETARÍA «A». Acuerdos del 23 de noviembre de 2026. Abastecedora de Coches, S.A. de C.V. vs. Hernández Gordillo Héctor y Hernández Tlatelpa Héctor. Ejecutivo Mercantil, Oficio Error Datos. 1 Acdo. Núm. Exp. 87/2023.',
    },
    {
      expediente: '1323/2024',
      courtMatch: 'Trigésimo Segundo de lo Civil',
      printedPage: 78,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-24/p078.webp',
      highlight: { x: 0.502, y: 0.6287, w: 0.4471, h: 0.0242 },
      excerpt:
        'SECRETARÍA «A». Aguilar Vázquez David vs. Laura Patricia Nieto González. Ordinario Civil, Se Reserva Proveer. 2 Acdos. Núm. Exp. 1323/2024.',
    },
    {
      expediente: '247/2025',
      courtMatch: 'Trigésimo Segundo de lo Civil',
      printedPage: 78,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-24/p078.webp',
      highlight: { x: 0.502, y: 0.5948, w: 0.4471, h: 0.0291 },
      excerpt:
        'SECRETARÍA «A». Acciona Edifica Santa Cruz, S. de R.L. de C.V. vs. Zamora Luna Jessyca Yarely. Civil, Dada Nueva Cuenta Se Glosa Expedientillo. 3 Acdos. Núm. Exp. 247/2025.',
    },
    {
      expediente: '323/2024',
      courtMatch: 'Décimo Primero de lo Civil',
      printedPage: 41,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-24/p041.webp',
      highlight: { x: 0.0941, y: 0.6154, w: 0.3765, h: 0.06 },
      excerpt:
        'SECRETARÍA «A». Acuerdos del 23 de noviembre de 2026. Acevedo Alavez Rosa María vs. Martínez García de Espinosa Martha Lilia y también conocida como Martha Lilia Martínez y Director del Registro Público de la Propiedad y de Comercio de la Ciudad de México. Ordinario Civil, Expedientillo P-28. 1 Acdo. Núm. Exp. 323/2024.',
    },
    {
      expediente: '639/2025',
      courtMatch: 'Trigésimo Primero de lo Civil de Proceso Oral',
      printedPage: 259,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-24/p259.webp',
      highlight: { x: 0.502, y: 0.4991, w: 0.4549, h: 0.0351 },
      excerpt:
        'SECRETARÍA «A». Acuerdos del 23 de noviembre de 2026. Aeromundo Ejecutivo, S.A. de C.V. vs. Aislamientos, S.A. de C.V. Otros Oralidad Mercantil. 1 Acdo. Núm. Exp. 639/2025.',
    },
    {
      expediente: '381/2026',
      courtMatch: 'Trigésimo Primero de lo Civil de Proceso Oral',
      printedPage: 259,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-24/p259.webp',
      highlight: { x: 0.502, y: 0.533, w: 0.4549, h: 0.0557 },
      excerpt:
        'SECRETARÍA «A». Banco Actinver, S.A., Institución de Banca Múltiple, Grupo Financiero Actinver, en su carácter de fiduciario del Fideicomiso de Actividades Empresariales F5487 vs. Rosell Bristain Sergio y Bristain Maya Rosa. Otros Oralidad Mercantil. 1 Acdo. Núm. Exp. 381/2026.',
    },
    {
      expediente: '917/2026',
      courtMatch: 'Trigésimo Segundo de lo Civil de Proceso Oral',
      printedPage: 260,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-24/p260.webp',
      highlight: { x: 0.502, y: 0.4579, w: 0.4549, h: 0.0339 },
      excerpt:
        'SECRETARÍA «A». Acuerdos del 23 de noviembre de 2026. Banco Covalto, Sociedad Anónima, Institución de Banca Múltiple vs. H Ayc Gro, S. de R.L. de C.V., Urbina Díaz Hugo y Urbina Velázquez Fernando. Ejecutivo Mercantil. 1 Acdo. Núm. Exp. 917/2026.',
    },
    {
      expediente: '177/2026',
      courtMatch: 'Trigésimo Segundo de lo Civil de Proceso Oral',
      printedPage: 260,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-24/p260.webp',
      highlight: { x: 0.502, y: 0.4894, w: 0.4588, h: 0.0363 },
      excerpt:
        'SECRETARÍA «A». BBVA México, S.A., Institución de Banca Múltiple, Grupo Financiero BBVA México vs. Besa Construcción Informática y Arquitectura, S.A. de C.V., Salas Díaz Iris Nayely y Díaz Romero Ernestina. Ejecutivo Mercantil. 1 Acdo. Núm. Exp. 177/2026.',
    },
  ],
}

/** Demo scans for Boletín Judicial CDMX No. 200 (25 nov 2026). */
const CDMX_2026_11_25_VISOR =
  'https://edigital.poderjudicialcdmx.gob.mx/visor20/WmtNNC9XNExEZmpxeHdUbXZFRzAxVW82WGRrVmc2RzZyZkF3RldNbWRIRi9URXlhYVZrdm44NSswL0NYeGxGSHQzdk9Lb05iZ0RROC9yTDVLa1lIL3NzdUtpN01GZkg2WTBGOHRiQi91Y0Rvc1dSMWp4YTlqY0lEK2R6MWlma0FISElJU0ZaLysrZVMyZlB4azZiVWNtZTRjUTZnZmsxeTBzcXprY1A1am04NDMyZ2ZCN0kvM21LZGdlbW5vMUk9'

export const LOCAL_BOLETIN_CDMX_2026_11_25: LocalBulletinManifest = {
  sourceKey: 'cdmx_boletin_pj',
  bulletinDate: '2026-11-25',
  title: 'Boletín Judicial CDMX',
  bulletinNumber: '200',
  dateLabelEs: '25 nov 2026',
  totalPages: 380,
  officialVisorUrl: CDMX_2026_11_25_VISOR,
  officialLandingUrl: 'https://poderjudicialcdmx.gob.mx/consulta-boletin/',
  entries: [
    {
      expediente: '297/2026',
      courtMatch: 'Décimo Primero de lo Civil',
      printedPage: 43,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-25/p043.webp',
      highlight: { x: 0.502, y: 0.8443, w: 0.4471, h: 0.0267 },
      excerpt:
        'SECRETARÍA «A». Acuerdos del 24 de noviembre de 2026. Albarrán Cuevas Patricia vs. Mendoza Delgado Guillermo. Ordinario Civil, P-78. 1 Acdo. Núm. Exp. 297/2026.',
    },
    {
      expediente: '1622/2024',
      courtMatch: 'Décimo Primero de lo Civil',
      printedPage: 44,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-25/p044.webp',
      highlight: { x: 0.502, y: 0.5306, w: 0.4471, h: 0.0388 },
      excerpt:
        'SECRETARÍA «B». Acuerdos del 24 de noviembre de 2026. Autofinanciamiento México, S.A. de C.V. vs. Palacios Jácome Carlos y Ramírez Núñez Laura Denisse y Rosendo Lumbreras Laura. Vía Ejecutiva Cuantía Menor Civil. 1 Acdo. Núm. Exp. 1622/2024.',
    },
    {
      expediente: '51/2026',
      courtMatch: 'Trigésimo Segundo de lo Civil',
      printedPage: 78,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-25/p078.webp',
      highlight: { x: 0.502, y: 0.2877, w: 0.4471, h: 0.0273 },
      excerpt:
        'SECRETARÍA «A». Acuerdos del 24 de noviembre de 2026. Alcalá González José Humberto vs. Grupo Mexicano de Seguros, S.A. de C.V. Ordinario Civil, Aclaración. 1 Acdo. Núm. Exp. 51/2026.',
    },
    {
      expediente: '435/2025',
      courtMatch: 'Trigésimo Segundo de lo Civil',
      printedPage: 78,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-25/p078.webp',
      highlight: { x: 0.502, y: 0.3119, w: 0.4471, h: 0.0376 },
      excerpt:
        'SECRETARÍA «A». Alva Pérez Jorge Fernando vs. Jefa de Gobierno de la Ciudad de México y Plascencia Díaz Julia. Ordinario Civil, Vista Oficio Telmex. 1 Acdo. Núm. Exp. 435/2025.',
    },
    {
      expediente: '1251/2024',
      courtMatch: 'Trigésimo Segundo de lo Civil',
      printedPage: 78,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-25/p078.webp',
      highlight: { x: 0.502, y: 0.427, w: 0.4471, h: 0.0297 },
      excerpt:
        'SECRETARÍA «A». Autofinanciamiento Mzd, S.A. de C.V. vs. Rodríguez Romero Carlos Ariel y Maturano Oliva Inés. Ejecutivo Mercantil, Autr. de la Parte Actora. 1 Acdo. Núm. Exp. 1251/2024.',
    },
    {
      expediente: '871/2026',
      courtMatch: 'Trigésimo Primero de lo Civil de Proceso Oral',
      printedPage: 254,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-25/p254.webp',
      highlight: { x: 0.0941, y: 0.6408, w: 0.3765, h: 0.0242 },
      excerpt:
        'SECRETARÍA «A». Acuerdos del 24 de noviembre de 2026. Daimler Financial Services, S.A. de C.V., Sofom E.N.R. vs. Rosales Sánchez Juan. Ejecutivo Mercantil. 2 Acdos. Núm. Exp. 871/2026.',
    },
    {
      expediente: '799/2026',
      courtMatch: 'Trigésimo Segundo de lo Civil de Proceso Oral',
      printedPage: 255,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-25/p255.webp',
      highlight: { x: 0.0941, y: 0.7765, w: 0.3765, h: 0.0242 },
      excerpt:
        'SECRETARÍA «A». Acuerdos del 24 de noviembre de 2026. Banco Nacional del Ejército, Fuerza Aérea y Armada, S.N.C. vs. Cruz Romero Juan Carlos. Oral Mercantil. 1 Acdo. Núm. Exp. 799/2026.',
    },
    {
      expediente: '1320/2026',
      courtMatch: 'Trigésimo Segundo de lo Civil de Proceso Oral',
      printedPage: 255,
      imagePath: '/ciceron/fuentes/cdmx/2026-11-25/p255.webp',
      highlight: { x: 0.502, y: 0.7674, w: 0.4471, h: 0.0345 },
      excerpt:
        'SECRETARÍA «B». Acuerdos del 24 de noviembre de 2026. BBVA México, S.A., Institución de Banca Múltiple, Grupo Financiero BBVA México vs. Muñiz Vega Yanerys. Oral Mercantil. 1 Acdo. Núm. Exp. 1320/2026.',
    },
  ],
}

const MANIFESTS: LocalBulletinManifest[] = [
  LOCAL_BOLETIN_CDMX_2026_11_24,
  LOCAL_BOLETIN_CDMX_2026_11_25,
]

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function courtMatches(courtName: string | null | undefined, courtMatch: string): boolean {
  if (!courtName?.trim()) return false
  return fold(courtName).includes(fold(courtMatch))
}

export type LocalFuenteMatch = {
  bulletin: LocalBulletinManifest
  entry: LocalBulletinEntryLocator
}

/**
 * Resolve a downloaded page locator by source key + date + expediente + court.
 * Falls back to expediente + court across known manifests when date/key omitted.
 */
export function findLocalFuente(opts: {
  sourceKey?: string | null
  bulletinDate?: string | null
  expediente: string | null | undefined
  courtName: string | null | undefined
}): LocalFuenteMatch | null {
  const exp = opts.expediente?.trim()
  if (!exp) return null

  const pool = MANIFESTS.filter((m) => {
    if (opts.sourceKey && m.sourceKey !== opts.sourceKey) return false
    if (opts.bulletinDate && m.bulletinDate !== opts.bulletinDate) return false
    return true
  })

  for (const bulletin of pool.length ? pool : MANIFESTS) {
    const entry = bulletin.entries.find(
      (e) => e.expediente === exp && courtMatches(opts.courtName, e.courtMatch)
    )
    if (entry) return { bulletin, entry }
  }

  // Expediente-only fallback when court text drifts slightly in fixtures.
  for (const bulletin of pool.length ? pool : MANIFESTS) {
    const hits = bulletin.entries.filter((e) => e.expediente === exp)
    if (hits.length === 1) return { bulletin, entry: hits[0]! }
  }

  return null
}

/** Inline citation for hit cards: «Boletín No. 199 · pág. 78». */
export function formatLocalFuenteCitation(match: LocalFuenteMatch): string {
  return `Boletín No. ${match.bulletin.bulletinNumber} · pág. ${match.entry.printedPage}`
}

/** Header line for the viewer page. */
export function formatLocalFuenteHeader(match: LocalFuenteMatch): string {
  const { bulletin, entry } = match
  return `${bulletin.title} · No. ${bulletin.bulletinNumber} · ${bulletin.dateLabelEs} · página ${entry.printedPage} de ${bulletin.totalPages}`
}

export function localFuenteViewerHref(hitId: string): string {
  return `/ciceron/boletines/fuente/${hitId}`
}

/**
 * Prefer the in-app viewer when a locator exists; otherwise keep the external URL.
 */
export function resolveHitFuenteLink(opts: {
  hitId: string
  expediente: string | null | undefined
  courtName: string | null | undefined
  sourceUrl: string | null | undefined
  sourceKey?: string | null
  bulletinDate?: string | null
}): {
  href: string | null
  external: boolean
  citation: string | null
  match: LocalFuenteMatch | null
} {
  const match = findLocalFuente({
    sourceKey: opts.sourceKey ?? 'cdmx_boletin_pj',
    bulletinDate: opts.bulletinDate,
    expediente: opts.expediente,
    courtName: opts.courtName,
  })
  // Demo CDMX hits omit bulletinDate filter when publication_date drifts with demo clock.
  const resolved =
    match ??
    findLocalFuente({
      sourceKey: 'cdmx_boletin_pj',
      expediente: opts.expediente,
      courtName: opts.courtName,
    })

  if (resolved) {
    return {
      href: localFuenteViewerHref(opts.hitId),
      external: false,
      citation: formatLocalFuenteCitation(resolved),
      match: resolved,
    }
  }

  const url = opts.sourceUrl?.trim() || null
  return {
    href: url,
    external: Boolean(url),
    citation: null,
    match: null,
  }
}
