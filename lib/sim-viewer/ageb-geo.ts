/**
 * Shared AGEB GeoJSON types + index helpers for Mapa mode (Task 4b).
 *
 * Source of truth: public/geo/ageb-cuauhtemoc-mh.geojson (INEGI MG CPV 2020).
 * Never invent CVEGEO codes or fabricate local real-vote results.
 */

export type AgebAlcaldia = 'Cuauhtémoc' | 'Miguel Hidalgo'

export type AgebFeatureProperties = {
  ageb_code: string
  cvegeo: string
  alcaldia: AgebAlcaldia
  centroid_lat: number
  centroid_lng: number
}

export type AgebFeature = {
  type: 'Feature'
  properties: AgebFeatureProperties
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export type AgebFeatureCollection = {
  type: 'FeatureCollection'
  features: AgebFeature[]
}

/** INEGI attribution shown under the map (Spanish, as required). */
export const INEGI_AGEB_ATTRIBUTION_ES =
  'Fuente: INEGI. Marco Geoestadístico, Censo de Población y Vivienda 2020.'

export const INEGI_AGEB_ATTRIBUTION_EN =
  'Source: INEGI. Marco Geoestadístico, Census of Population and Housing 2020.'

/** Public URL for the committed FeatureCollection. */
export const AGEB_GEOJSON_PUBLIC_PATH = '/geo/ageb-cuauhtemoc-mh.geojson'

export function buildAgebCodeSet(
  features: readonly AgebFeature[],
): Set<string> {
  const set = new Set<string>()
  for (const f of features) {
    const code = f.properties?.ageb_code
    if (typeof code === 'string' && code.length > 0) set.add(code)
  }
  return set
}

export function indexAgebFeaturesByCode(
  features: readonly AgebFeature[],
): Map<string, AgebFeature> {
  const map = new Map<string, AgebFeature>()
  for (const f of features) {
    const code = f.properties?.ageb_code
    if (typeof code === 'string' && code.length > 0) map.set(code, f)
  }
  return map
}

export function featuresByAlcaldia(
  features: readonly AgebFeature[],
  alcaldia: AgebAlcaldia,
): AgebFeature[] {
  return features.filter((f) => f.properties.alcaldia === alcaldia)
}

/**
 * Mean of feature centroids (geographic). Used for subtle alcaldía labels.
 */
export function alcaldiaLabelAnchor(
  features: readonly AgebFeature[],
  alcaldia: AgebAlcaldia,
): { lat: number; lng: number } | null {
  const subset = featuresByAlcaldia(features, alcaldia)
  if (subset.length === 0) return null
  let lat = 0
  let lng = 0
  for (const f of subset) {
    lat += f.properties.centroid_lat
    lng += f.properties.centroid_lng
  }
  return { lat: lat / subset.length, lng: lng / subset.length }
}
