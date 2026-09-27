/**
 * Feature flag for the Visor de simulación.
 * Default OFF — must be explicitly set to the string 'true'.
 */
export function isSimViewerEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SIM_VIEWER_ENABLED === 'true'
}

/**
 * Local/preview escape hatch so the fixture page can be screenshotted
 * without an admin session. Never enable in production.
 */
export function isSimViewerFixtureOpen(): boolean {
  if (process.env.SIM_VIEWER_FIXTURE_OPEN === 'true') return true
  return process.env.NODE_ENV === 'development'
}
