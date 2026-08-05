/**
 * CDMX geodata — shared by Señal Express (§7.1) and, later, Mi Colonia (§2/§7.3).
 *
 * Framework-free (no React / Next / Supabase imports) so it runs identically on
 * the server and the client and can be unit-tested in isolation.
 *
 * Scope for launch is the two pilot alcaldías: Cuauhtémoc + Miguel Hidalgo. The
 * resolvers use a coarse bounding-box / nearest-point approximation and RETURN
 * NULL WHEN UNCERTAIN so the UI falls back to an explicit picker rather than
 * guessing. `ALCALDIA_META` is loaded from `data/alcaldia-meta.cdmx.json`; the
 * `direccion`/`email` fields are `TODO_FILL_FROM_OFFICIAL_SOURCE` placeholders
 * until the owner fills them from official sources — this module NEVER invents
 * an address, email, or official's name (CC_BUILD_CONTEXT.md §2). The
 * placeholder is normalised to `null` here so downstream code (the oficio PDF)
 * simply omits the line.
 */

import rawAlcaldiaMeta from '@/data/alcaldia-meta.cdmx.json'

/** Sentinel value in the JSON that means "not yet filled — never invent it". */
export const OFFICIAL_SOURCE_TODO = 'TODO_FILL_FROM_OFFICIAL_SOURCE'

/** The two launch alcaldías, spelled exactly as in the JSON `alcaldia` field. */
export const LAUNCH_ALCALDIAS = ['Cuauhtémoc', 'Miguel Hidalgo'] as const
export type LaunchAlcaldia = (typeof LAUNCH_ALCALDIAS)[number]

export function isLaunchAlcaldia(value: string): value is LaunchAlcaldia {
  return (LAUNCH_ALCALDIAS as readonly string[]).includes(value)
}

/**
 * Destinatario metadata for an alcaldía oficio. `direccion`/`email` are `null`
 * whenever the JSON still holds the TODO placeholder (never rendered). The slug
 * fields let confirm-time code resolve the FK rows (`citizen_targets`,
 * `conscious_locations`) by slug (§7.1 owner decision).
 */
export interface AlcaldiaMeta {
  alcaldia: LaunchAlcaldia
  destinatarioTitulo: string
  dependencia: string
  /** Official reception address, or null while it is still the TODO placeholder. */
  direccion: string | null
  /** Official contact email, or null while it is still the TODO placeholder. */
  email: string | null
  notas: string | null
  /** Slug in `citizen_targets` (target_kind='municipality'). */
  citizenTargetSlug: string
  /** Slug in `conscious_locations` (the alcaldía "broad bucket" row). */
  consciousLocationSlug: string
}

interface RawAlcaldiaMetaEntry {
  alcaldia: string
  destinatario_titulo: string
  dependencia: string
  direccion: string
  email: string
  notas: string
}

interface RawAlcaldiaMetaFile {
  entries: RawAlcaldiaMetaEntry[]
}

/**
 * Slug wiring per launch alcaldía. These match the seed scripts:
 *  - citizen_targets: `scripts/seed-citizen-targets-cdmx.ts` (alcaldia-*)
 *  - conscious_locations: `scripts/seed-conscious-locations-cdmx.ts` (cdmx-*)
 */
const ALCALDIA_SLUGS: Record<
  LaunchAlcaldia,
  { citizenTargetSlug: string; consciousLocationSlug: string }
> = {
  Cuauhtémoc: {
    citizenTargetSlug: 'alcaldia-cuauhtemoc',
    consciousLocationSlug: 'cdmx-cuauhtemoc',
  },
  'Miguel Hidalgo': {
    citizenTargetSlug: 'alcaldia-miguel-hidalgo',
    consciousLocationSlug: 'cdmx-miguel-hidalgo',
  },
}

/** Normalise the TODO sentinel (and blanks) to null; never invent a value. */
function officialOrNull(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed === OFFICIAL_SOURCE_TODO) return null
  return trimmed
}

function buildAlcaldiaMeta(): Record<LaunchAlcaldia, AlcaldiaMeta> {
  const file = rawAlcaldiaMeta as unknown as RawAlcaldiaMetaFile
  const out = {} as Record<LaunchAlcaldia, AlcaldiaMeta>
  for (const entry of file.entries ?? []) {
    if (!isLaunchAlcaldia(entry.alcaldia)) continue
    const slugs = ALCALDIA_SLUGS[entry.alcaldia]
    out[entry.alcaldia] = {
      alcaldia: entry.alcaldia,
      destinatarioTitulo: entry.destinatario_titulo,
      dependencia: entry.dependencia,
      direccion: officialOrNull(entry.direccion),
      email: officialOrNull(entry.email),
      notas: officialOrNull(entry.notas),
      citizenTargetSlug: slugs.citizenTargetSlug,
      consciousLocationSlug: slugs.consciousLocationSlug,
    }
  }
  return out
}

/** Destinatario metadata for the two launch alcaldías, loaded from the JSON. */
export const ALCALDIA_META: Record<LaunchAlcaldia, AlcaldiaMeta> =
  buildAlcaldiaMeta()

/** Convenience accessor; returns null for any non-launch / unknown alcaldía. */
export function getAlcaldiaMeta(alcaldia: string): AlcaldiaMeta | null {
  return isLaunchAlcaldia(alcaldia) ? (ALCALDIA_META[alcaldia] ?? null) : null
}

// ---------------------------------------------------------------------------
// Coarse geo resolution. Approximate boxes — precise enough to pre-select the
// picker when the user is clearly inside one alcaldía, and to bail out (null)
// near borders or outside the pilot so the UI shows the manual picker.
// ---------------------------------------------------------------------------

interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

/**
 * Approximate bounding boxes (decimal degrees). Deliberately non-overlapping in
 * the middle so an ambiguous point (in neither, or a future third alcaldía)
 * resolves to null and the user picks manually.
 */
const ALCALDIA_BBOX: Record<LaunchAlcaldia, BoundingBox> = {
  Cuauhtémoc: { minLat: 19.412, maxLat: 19.468, minLng: -99.176, maxLng: -99.118 },
  'Miguel Hidalgo': {
    minLat: 19.386,
    maxLat: 19.452,
    minLng: -99.238,
    maxLng: -99.178,
  },
}

function inBox(lat: number, lng: number, box: BoundingBox): boolean {
  return (
    lat >= box.minLat &&
    lat <= box.maxLat &&
    lng >= box.minLng &&
    lng <= box.maxLng
  )
}

/**
 * Resolve a coordinate to one of the launch alcaldías, or null when uncertain
 * (outside both boxes, or ambiguously inside more than one). Callers show the
 * manual picker on null — we never guess a destinatario from geography alone.
 */
export function resolveAlcaldia(lat: number, lng: number): LaunchAlcaldia | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const matches = LAUNCH_ALCALDIAS.filter((a) =>
    inBox(lat, lng, ALCALDIA_BBOX[a])
  )
  return matches.length === 1 ? matches[0] : null
}

interface ColoniaPoint {
  colonia: string
  alcaldia: LaunchAlcaldia
  lat: number
  lng: number
}

/**
 * A minimal set of well-known colonia centroids for launch. Intentionally small
 * — the resolver only claims a colonia when a coordinate is very close to one
 * of these anchors; otherwise it returns null and the user types/omits it. This
 * list can grow without touching the resolver logic.
 */
const COLONIA_POINTS: ColoniaPoint[] = [
  { colonia: 'Roma Norte', alcaldia: 'Cuauhtémoc', lat: 19.4185, lng: -99.1618 },
  { colonia: 'Roma Sur', alcaldia: 'Cuauhtémoc', lat: 19.4079, lng: -99.1583 },
  { colonia: 'Condesa', alcaldia: 'Cuauhtémoc', lat: 19.4109, lng: -99.1745 },
  { colonia: 'Juárez', alcaldia: 'Cuauhtémoc', lat: 19.4258, lng: -99.1596 },
  { colonia: 'Centro', alcaldia: 'Cuauhtémoc', lat: 19.4326, lng: -99.1332 },
  { colonia: 'Doctores', alcaldia: 'Cuauhtémoc', lat: 19.4213, lng: -99.1445 },
  { colonia: 'Santa María la Ribera', alcaldia: 'Cuauhtémoc', lat: 19.4498, lng: -99.1587 },
  { colonia: 'Polanco', alcaldia: 'Miguel Hidalgo', lat: 19.4333, lng: -99.1946 },
  { colonia: 'Anzures', alcaldia: 'Miguel Hidalgo', lat: 19.4306, lng: -99.1782 },
  { colonia: 'Escandón', alcaldia: 'Miguel Hidalgo', lat: 19.4022, lng: -99.1801 },
  { colonia: 'Tacuba', alcaldia: 'Miguel Hidalgo', lat: 19.4576, lng: -99.1897 },
  { colonia: 'San Miguel Chapultepec', alcaldia: 'Miguel Hidalgo', lat: 19.4128, lng: -99.1889 },
]

/** Rough great-circle distance in km (haversine); good enough for ~1 km checks. */
function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Only claim a colonia within this radius of a known anchor. */
const COLONIA_MAX_KM = 1.1

/**
 * Best-effort colonia name for a coordinate, or null when uncertain. Returns
 * the nearest anchored colonia within `COLONIA_MAX_KM`; otherwise null so the
 * UI leaves the (optional) colonia field for the user to fill.
 */
export function resolveColonia(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  let best: { colonia: string; km: number } | null = null
  for (const p of COLONIA_POINTS) {
    const km = haversineKm(lat, lng, p.lat, p.lng)
    if (km <= COLONIA_MAX_KM && (!best || km < best.km)) {
      best = { colonia: p.colonia, km }
    }
  }
  return best?.colonia ?? null
}

/**
 * Minimal colonia adjacency for launch (used later by Mi Colonia's
 * vs.-neighbour module, §7.3). Keys and values are colonia display names as in
 * COLONIA_POINTS. Not exhaustive — extend as coverage grows.
 */
export const COLONIA_ADJACENCY: Record<string, string[]> = {
  'Roma Norte': ['Roma Sur', 'Condesa', 'Juárez', 'Doctores'],
  'Roma Sur': ['Roma Norte', 'Condesa', 'Escandón'],
  Condesa: ['Roma Norte', 'Roma Sur', 'Escandón', 'San Miguel Chapultepec'],
  'Juárez': ['Roma Norte', 'Centro', 'Anzures'],
  Centro: ['Juárez', 'Doctores', 'Santa María la Ribera'],
  Doctores: ['Roma Norte', 'Centro'],
  'Santa María la Ribera': ['Centro', 'Tacuba'],
  Polanco: ['Anzures', 'San Miguel Chapultepec'],
  Anzures: ['Polanco', 'Juárez'],
  'Escandón': ['Condesa', 'Roma Sur', 'San Miguel Chapultepec'],
  Tacuba: ['Santa María la Ribera'],
  'San Miguel Chapultepec': ['Condesa', 'Polanco', 'Escandón'],
}
