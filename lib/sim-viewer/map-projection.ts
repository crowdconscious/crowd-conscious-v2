/**
 * SVG projection helpers for AGEB polygons (Task 4b).
 * d3-geo geoMercator fitted to the FeatureCollection bounds — no tiles.
 */

import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import type { AgebFeature, AgebFeatureCollection } from './ageb-geo.ts'

export type MapProjection = {
  /** Project [lng, lat] → [x, y] in SVG space. */
  project: (lng: number, lat: number) => [number, number] | null
  /** geoPath string builder for Polygon / MultiPolygon features. */
  path: (feature: GeoPermissibleObjects) => string | null
  width: number
  height: number
}

/**
 * Fit a Mercator projection to the collection inside a viewport with padding.
 */
export function createAgebProjection(
  collection: AgebFeatureCollection | { type: 'FeatureCollection'; features: AgebFeature[] },
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
