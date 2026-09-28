/**
 * Visor de simulación feature flag.
 * Default OFF. Set NEXT_PUBLIC_SIM_VIEWER_ENABLED=true to enable routes/API.
 */

/** Client + server: true only when explicitly set to the string `'true'`. */
export function isSimViewerEnabled(): boolean {
  if (typeof process === 'undefined') return false
  return process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED === 'true'
}

/**
 * Local/preview escape hatch so the fixture page can be screenshotted
 * without an admin session. Never enable in production.
 */
export function isSimViewerFixtureOpen(): boolean {
  if (typeof process === 'undefined') return false
  if (process.env.SIM_VIEWER_FIXTURE_OPEN === 'true') return true
  return process.env.NODE_ENV === 'development'
}
