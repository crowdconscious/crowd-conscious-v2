/**
 * Shared admin policy for the platform.
 *
 * Two paths grant admin access:
 *
 *   1. `profiles.user_type === 'admin'` — the primary, DB-stored signal.
 *      Set via the admin UI or migration.
 *
 *   2. `process.env.ADMIN_EMAIL` matches the user's email (case-insensitive,
 *      trimmed) — a break-glass for the platform owner so we never get
 *      locked out if the `user_type` row is missing / wrong.
 *
 * This file is the single source of truth for that policy. Everything that
 * gates admin surfaces (API routes, server components, layout guards) should
 * funnel through `isAdminUser` so the rule cannot drift between sites.
 *
 * History: before this helper landed, ~50 API routes did a strict
 * `user_type !== 'admin'` reject and ~18 did the OR-with-ADMIN_EMAIL pattern.
 * That meant an ADMIN_EMAIL-only admin (no `user_type` row, e.g. the platform
 * owner immediately after a migration / fresh DB) could open the
 * admin shell but be 403'd by half the API endpoints behind it. The audit
 * flagged this as inconsistent. This helper unifies both worlds.
 */

export type AdminCheckSubject = {
  user_type?: string | null
  email?: string | null
} | null | undefined

/**
 * Returns true if the given user/profile is an admin under the platform
 * policy described at the top of this file. Pass any object that exposes
 * `user_type` and `email` (e.g. the merged profile returned by
 * `getCurrentUser()`, or a targeted `select('user_type, email')` row).
 *
 * Returns false for null/undefined input — callers don't need to null-check.
 */
export function isAdminUser(subject: AdminCheckSubject): boolean {
  if (!subject) return false

  if (subject.user_type === 'admin') return true

  const envAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const userEmail = subject.email?.toLowerCase().trim()
  return !!envAdminEmail && !!userEmail && envAdminEmail === userEmail
}
