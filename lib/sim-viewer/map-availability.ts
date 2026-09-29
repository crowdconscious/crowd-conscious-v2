/**
 * Mapa mode availability — Task 4b.
 *
 * Show the Columnas / Mapa toggle only when ≥90% of the run's personas have
 * agebCode + centroid coordinates that exist in the committed AGEB GeoJSON.
 * Personas without a mappable location are simply omitted from the map dots;
 * the UI notes "N agentes sin ubicación".
 */

export const MAP_AVAILABILITY_THRESHOLD = 0.9

export type MapPersonaLocation = {
  agebCode: string | null
  centroidLat: number | null
  centroidLng: number | null
}

export type MapAvailability = {
  /** True when mappable / total ≥ MAP_AVAILABILITY_THRESHOLD. */
  available: boolean
  total: number
  mappable: number
  /** Personas missing code, coords, or a GeoJSON match. */
  missingLocation: number
  ratio: number
}

export function isPersonaMappable(
  persona: MapPersonaLocation,
  geoCodes: ReadonlySet<string>,
): boolean {
  const code = persona.agebCode
  if (typeof code !== 'string' || code.trim().length === 0) return false
  if (!geoCodes.has(code)) return false
  if (typeof persona.centroidLat !== 'number' || !Number.isFinite(persona.centroidLat)) {
    return false
  }
  if (typeof persona.centroidLng !== 'number' || !Number.isFinite(persona.centroidLng)) {
    return false
  }
  return true
}

export function evaluateMapAvailability(
  personas: readonly MapPersonaLocation[],
  geoCodes: ReadonlySet<string>,
): MapAvailability {
  const total = personas.length
  if (total === 0) {
    return {
      available: false,
      total: 0,
      mappable: 0,
      missingLocation: 0,
      ratio: 0,
    }
  }

  let mappable = 0
  for (const p of personas) {
    if (isPersonaMappable(p, geoCodes)) mappable += 1
  }
  const missingLocation = total - mappable
  const ratio = mappable / total
  return {
    available: ratio >= MAP_AVAILABILITY_THRESHOLD,
    total,
    mappable,
    missingLocation,
    ratio,
  }
}
