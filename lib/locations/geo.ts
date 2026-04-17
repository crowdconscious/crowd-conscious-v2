/**
 * Tiny geospatial helpers used by the locations page (map + Azteca module).
 * Kept dependency-free so it can be imported on both server and client.
 */

/** Estadio Azteca coordinates (CDMX). */
export const ESTADIO_AZTECA = { lat: 19.3029, lng: -99.1505 } as const

/** CDMX downtown — default map center when no city filter is applied. */
export const CDMX_CENTER = { lat: 19.4326, lng: -99.1332 } as const

/** Window during which the "Nearest to Estadio Azteca" module is visible.
 *  Roughly the month before kickoff through the end of the tournament. */
export const AZTECA_MODULE_VISIBLE_FROM = new Date('2026-05-15T00:00:00-05:00')
export const AZTECA_MODULE_VISIBLE_UNTIL = new Date('2026-07-15T23:59:59-05:00')

export function isAztecaModuleVisible(now: Date = new Date()): boolean {
  return now >= AZTECA_MODULE_VISIBLE_FROM && now <= AZTECA_MODULE_VISIBLE_UNTIL
}

/** Haversine distance in kilometers between two lat/lng points. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Rough drive-time estimate in minutes from a distance in km.
 *  CDMX traffic averages ~25 km/h end-to-end including stops, so we use 25
 *  km/h as the divisor. This is a public-facing badge, not a routing API:
 *  precision matters less than calibrated under-promising. */
export function approxMinutesByCar(distanceKm: number): number {
  return Math.max(5, Math.round((distanceKm / 25) * 60))
}
