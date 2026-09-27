/**
 * Server-side switch: whether non-admins may read a resolved-Pulse replay.
 *
 * Default OFF (`false`). Francisco decides public vs sales-only; until then
 * every non-admin request 404s even for resolved Pulses. Flip by setting
 * `SIM_VIEWER_PUBLIC_CLOSED=true` (server-only — not NEXT_PUBLIC_).
 */

/** True only when explicitly set to the string `'true'`. */
export function isSimViewerPublicClosedEnabled(): boolean {
  if (typeof process === 'undefined') return false
  return process.env.SIM_VIEWER_PUBLIC_CLOSED === 'true'
}
