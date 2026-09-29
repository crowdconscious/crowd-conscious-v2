/**
 * CDMX alcaldía (municipio) GeoJSON types for all-CDMX map context (Task 4c).
 *
 * Source: public/geo/cdmx-alcaldias.geojson — INEGI MG CPV 2020, layer 09mun.
 * Never invent boundaries or names.
 */

export type CdmxAlcaldiaProperties = {
  cvegeo: string
  nombre: string
  /** Point-on-surface from unsimplified polygon (for labels). */
  label_lat: number
  label_lng: number
}

export type CdmxAlcaldiaFeature = {
  type: 'Feature'
  properties: CdmxAlcaldiaProperties
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export type CdmxAlcaldiaFeatureCollection = {
  type: 'FeatureCollection'
  features: CdmxAlcaldiaFeature[]
}

/** Public URL for the committed 16-alcaldía FeatureCollection. */
export const CDMX_ALCALDIAS_GEOJSON_PUBLIC_PATH = '/geo/cdmx-alcaldias.geojson'

/** CVEGEO for alcaldías that currently carry AGEB detail + persona dots. */
export const ACTIVE_ALCALDIA_CVEGEO = new Set(['09015', '09016'])

export const ACTIVE_ALCALDIA_NAMES = new Set([
  'Cuauhtémoc',
  'Miguel Hidalgo',
])

export const CDMX_SAMPLE_CAPTION_ES =
  'Muestra actual: Cuauhtémoc y Miguel Hidalgo · próximamente más alcaldías'

export function isActiveAlcaldia(
  cvegeoOrNombre: string | null | undefined,
): boolean {
  if (!cvegeoOrNombre) return false
  return (
    ACTIVE_ALCALDIA_CVEGEO.has(cvegeoOrNombre) ||
    ACTIVE_ALCALDIA_NAMES.has(cvegeoOrNombre)
  )
}
