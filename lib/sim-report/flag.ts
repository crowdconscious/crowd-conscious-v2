/**
 * Simulation PDF report feature flag.
 * Default OFF. Set SIM_REPORT_ENABLED=true to enable API + UI surfaces.
 */

/** Server (and build-time): true only when explicitly set to the string `'true'`. */
export function isSimReportEnabled(): boolean {
  if (typeof process === 'undefined') return false
  return process.env.SIM_REPORT_ENABLED === 'true'
}
