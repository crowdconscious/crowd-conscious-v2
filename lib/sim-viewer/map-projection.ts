/**
 * SVG projection helpers for sim-viewer Mapa mode (Tasks 4b / 4c).
 * d3-geo geoMercator fitted to the FeatureCollection bounds — no tiles.
 *
 * Task 4c fits to the full CDMX alcaldías extent so Cuauhtémoc + Miguel
 * Hidalgo read as an active sample inside the whole city.
 */

import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import type { AgebFeature, AgebFeatureCollection } from './ageb-geo.ts'
import type { CdmxAlcaldiaFeatureCollection } from './cdmx-alcaldias.ts'

export type MapProjection = {
  /** Project [lng, lat] → [x, y] in SVG space. */
  project: (lng: number, lat: number) => [number, number] | null
  /** geoPath string builder for Polygon / MultiPolygon features. */
  path: (feature: GeoPermissibleObjects) => string | null
  width: number
  height: number
}

type FitCollection =
  | AgebFeatureCollection
  | CdmxAlcaldiaFeatureCollection
  | { type: 'FeatureCollection'; features: AgebFeature[] }
  | GeoPermissibleObjects

/**
 * Fit a Mercator projection to the collection inside a viewport with padding.
 */
export function createAgebProjection(
  collection: FitCollection,
  width: number,
  height: number,
  padding = 12,
): MapProjection {
  const w = Math.max(1, width)
  const h = Math.max(1, height)
  const projection = geoMercator().fitExtent(
    [
      [padding, padding],
      [w - padding, h - padding],
    ],
    collection as GeoPermissibleObjects,
  )
  const pathGen = geoPath(projection)
  return {
    width: w,
    height: h,
    project(lng, lat) {
      const p = projection([lng, lat])
      if (!p) return null
      if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null
      return [p[0], p[1]]
    },
    path(feature) {
      return pathGen(feature)
    },
  }
}

/** Alias — Task 4c fits the same helper to the CDMX alcaldías collection. */
export const createCdmxProjection = createAgebProjection
