/**
 * Rail admin-link visibility for Cicéron demo sessions.
 * Métricas / Ventas / Fuentes admin: admin role only, never prospect invites.
 */

export type RailVisibilityInput = {
  /** Membership role key (`admin` | `socio` | …). */
  role: string
  /**
   * True when the invite that opened the session was minted for a non-admin
   * default persona (prospect path). Null/undefined = unknown → treat as
   * prospect unless role is admin and invite is known admin mint.
   */
  inviteIsAdminMint?: boolean | null
}

/**
 * Prospect session: non-admin role, OR an invite that is not an admin mint.
 * Admin rail links must never appear for prospect invite sessions.
 */
export function isProspectDemoSession(input: RailVisibilityInput): boolean {
  if (input.role !== 'admin') return true
  if (input.inviteIsAdminMint === false) return true
  return false
}

export function shouldShowAdminRailLinks(input: {
  roleKey: string
  isProspectSession: boolean
}): boolean {
  if (input.isProspectSession) return false
  return input.roleKey === 'admin'
}
