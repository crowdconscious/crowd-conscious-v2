/**
 * Visor de simulación feature flag.
 * Default OFF. Set NEXT_PUBLIC_SIM_VIEWER_ENABLED=true to enable routes/API.
 */

/** Client + server: true only when explicitly set to the string `'true'`. */
export function isSimViewerEnabled(): boolean {
  if (typeof process === 'undefined') return false
  return process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED === 'true'
}
