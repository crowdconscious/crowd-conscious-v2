/**
 * Mapa mode availability.
 *
 * Show the Columnas / Mapa toggle when ≥90% of the run's personas can be
 * placed on the map — via AGEB centroids when present, otherwise via colonia
 * or alcaldía fallbacks (see persona-map-location.ts).
 *
 * Empty vote lists (in-progress runs) are treated as "pending" rather than
 * unavailable so the format choice can still appear; the viewer shows a
 * running banner separately.
 */

import {
  isPersonaPlaceable,
  type PersonaForMapLocation,
} from './persona-map-location.ts'

export const MAP_AVAILABILITY_THRESHOLD = 0.9

/** @deprecated Prefer PersonaForMapLocation — kept for existing call sites. */
export type MapPersonaLocation = PersonaForMapLocation

export type MapAvailability = {
  /** True when placeable / total ≥ MAP_AVAILABILITY_THRESHOLD. */
  available: boolean
  total: number
  mappable: number
  /** Personas that could not be placed even with colonia/alcaldía fallback. */
  missingLocation: number
  ratio: number
  /**
   * True when the vote list is empty so placement cannot be scored yet
   * (typical of an in-flight auto-run). Callers may still show the toggle.
   */
  pending: boolean
}

export { isPersonaMappable } from './map-availability-ageb.ts'

export function evaluateMapAvailability(
  personas: readonly PersonaForMapLocation[],
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
      pending: true,
    }
  }

  let mappable = 0
  for (const p of personas) {
    if (isPersonaPlaceable(p, geoCodes)) mappable += 1
  }
  const missingLocation = total - mappable
  const ratio = mappable / total
  return {
    available: ratio >= MAP_AVAILABILITY_THRESHOLD,
    total,
    mappable,
    missingLocation,
    ratio,
    pending: false,
  }
}
