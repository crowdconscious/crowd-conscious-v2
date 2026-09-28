/**
 * Visor de simulación — Task 2 access gate (pure).
 *
 * Product rule: a non-admin must never see the AI prediction while the Pulse
 * is still open. A 404 (not 403) is deliberate — confirming a simulation
 * exists is itself an anchoring signal.
 *
 * CTO decisions (reversible) applied here:
 *   - Non-admin only when prediction_markets.status === 'resolved'
 *   - revealed_at (on the run) and status must BOTH allow (stricter wins)
 *   - SIM_VIEWER_PUBLIC_CLOSED defaults ON (public on closed); set to
 *     the string `'false'` for sales-only
 *   - is_fixture runs are admin-only
 */

export type ReplayAccessInput = {
  isAdmin: boolean
  /** Admin-only query flag `?includeReal=1`. Ignored for non-admins. */
  includeRealParam: boolean
  /** `prediction_markets.status` (active | resolved | draft | cancelled | …). */
  pulseStatus: string
  /** `simulation_runs.revealed_at`. Null = not revealed for public. */
  runRevealedAt: string | null
  /** Fixture/seed runs must never leak to non-admins. */
  runIsFixture: boolean
  /**
   * Server-side switch `SIM_VIEWER_PUBLIC_CLOSED`.
   * Default ON (public on closed). Set to the string `'false'` to make
   * resolved-Pulse replays sales-only again.
   */
  publicClosedEnabled: boolean
}

export type ReplayAccessAllowed = {
  allow: true
  /** Whether the response may include realAggregates. */
  includeRealAggregates: boolean
  /**
   * True only for cacheable public closed responses (no auth variance).
   * Admin / open-pulse responses must not be CDN-cached.
   */
  cachePublic: boolean
}

export type ReplayAccessDenied = {
  allow: false
  /** Always 404 — never 403 (would confirm a simulation exists). */
  status: 404
}

export type ReplayAccessDecision = ReplayAccessAllowed | ReplayAccessDenied

/** Pulse is "closed" for the viewer only when status is exactly `resolved`. */
export function isPulseResolvedForViewer(pulseStatus: string): boolean {
  return pulseStatus === 'resolved'
}

/**
 * Wire status for SimulationReplayPayload.pulse.status.
 * Repo stores active|resolved|…; the viewer contract speaks open|closed.
 */
export function toSimulationPulseStatus(
  pulseStatus: string,
): 'open' | 'closed' {
  return isPulseResolvedForViewer(pulseStatus) ? 'closed' : 'open'
}

function isRevealed(revealedAt: string | null): boolean {
  return typeof revealedAt === 'string' && revealedAt.length > 0
}

/**
 * Decide whether a caller may read a simulation replay, and whether
 * realAggregates may be included.
 *
 * Denied decisions ALWAYS use HTTP 404 (never 403).
 */
export function decideReplayAccess(
  input: ReplayAccessInput,
): ReplayAccessDecision {
  const resolved = isPulseResolvedForViewer(input.pulseStatus)
  const revealed = isRevealed(input.runRevealedAt)

  if (input.isAdmin) {
    // Admins always see the replay (any status, fixtures included).
    // realAggregates stay null on open Pulses unless ?includeReal=1.
    const includeRealAggregates =
      resolved || (input.includeRealParam === true)
    return {
      allow: true,
      includeRealAggregates,
      cachePublic: false,
    }
  }

  // Non-admin: every gate must pass. Stricter-of-status-and-revealed wins
  // (both must allow). Public switch off → always 404 (sales-only mode).
  if (!input.publicClosedEnabled) {
    return { allow: false, status: 404 }
  }
  if (!resolved) {
    return { allow: false, status: 404 }
  }
  if (!revealed) {
    return { allow: false, status: 404 }
  }
  if (input.runIsFixture) {
    return { allow: false, status: 404 }
  }

  return {
    allow: true,
    includeRealAggregates: true,
    cachePublic: true,
  }
}
