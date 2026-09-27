/**
 * Server-side switch: whether non-admins may read a resolved-Pulse replay.
 *
 * Default ON (public on closed). Francisco's call: once a Pulse is
 * `resolved` (and revealed_at allows), anyone — including logged-out
 * visitors — may view the real simulation replay. Set
 * `SIM_VIEWER_PUBLIC_CLOSED=false` to revert to sales-only.
 *
 * Server-only — not NEXT_PUBLIC_. The whole feature is still gated by
 * `NEXT_PUBLIC_SIM_VIEWER_ENABLED` (default false).
 */

/**
 * True by default. Explicit string `'false'` turns public closed-Pulse
 * reads off; any other value (including unset / `'true'`) keeps them on.
 */
export function isSimViewerPublicClosedEnabled(): boolean {
  if (typeof process === 'undefined') return true
  const raw = process.env.SIM_VIEWER_PUBLIC_CLOSED
  if (raw === undefined || raw === '') return true
  return raw !== 'false'
}
