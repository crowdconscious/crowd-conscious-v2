/**
 * Resolve a map lat/lng for a simulation persona.
 *
 * Preference order:
 *   1. AGEB code present in the committed Cuau/MH GeoJSON + stored centroids
 *   2. Colonia centroid (fallback when AGEB SQL from PR #28 was not applied)
 *   3. Alcaldía label centroid (last resort — still places the agent on the map)
 *
 * Auto-run runs share `simulation_personas` with manual runs; they do not
 * carry their own map payload. Missing AGEB columns are a data gap, not a
 * reason to hide the Columnas/Mapa toggle.
 */

import {
  ALCALDIA_CENTROIDS,
  COLONIA_CENTROIDS,
} from './location-fallbacks.ts'
import { isPersonaMappable } from './map-availability-ageb.ts'

export type MapLocationPrecision = 'ageb' | 'colonia' | 'alcaldia'

export type ResolvedMapLocation = {
  lat: number
  lng: number
  precision: MapLocationPrecision
}

export type PersonaForMapLocation = {
  agebCode: string | null
  centroidLat: number | null
  centroidLng: number | null
  colonia: string | null
  alcaldia: string
}

const COLONIA_BY_NAME = new Map(
  COLONIA_CENTROIDS.map((c) => [normalizeName(c.colonia), c]),
)

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function resolvePersonaMapLocation(
  persona: PersonaForMapLocation,
  geoCodes: ReadonlySet<string>,
): ResolvedMapLocation | null {
  if (isPersonaMappable(persona, geoCodes)) {
    return {
      lat: persona.centroidLat as number,
      lng: persona.centroidLng as number,
      precision: 'ageb',
    }
  }

  // Stored centroids without a GeoJSON AGEB match still place the agent.
  if (
    typeof persona.centroidLat === 'number' &&
    Number.isFinite(persona.centroidLat) &&
    typeof persona.centroidLng === 'number' &&
    Number.isFinite(persona.centroidLng)
  ) {
    return {
      lat: persona.centroidLat,
      lng: persona.centroidLng,
      precision: 'ageb',
    }
  }

  if (persona.colonia) {
    const hit = COLONIA_BY_NAME.get(normalizeName(persona.colonia))
    if (hit) {
      return { lat: hit.lat, lng: hit.lng, precision: 'colonia' }
    }
  }

  const alcaldia = ALCALDIA_CENTROIDS[persona.alcaldia]
  if (alcaldia) {
    return { lat: alcaldia.lat, lng: alcaldia.lng, precision: 'alcaldia' }
  }

  return null
}

export function isPersonaPlaceable(
  persona: PersonaForMapLocation,
  geoCodes: ReadonlySet<string>,
): boolean {
  return resolvePersonaMapLocation(persona, geoCodes) != null
}
