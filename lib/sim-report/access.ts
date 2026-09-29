/**
 * Access gates for simulation PDF reports.
 *
 * Summary (free): anyone, when Pulse is closed (resolved) AND the run is
 * revealed AND the feature flag is on. Fixtures stay admin-only.
 *
 * Full (paid): same eligibility as summary, plus admin OR an active
 * sponsor_accounts row with is_pulse_client=true, OR an email on
 * SIM_REPORT_FULL_ALLOWLIST (comma-separated).
 *
 * There is no dedicated "sim report entitlement" column yet — closest
 * existing paying-client signal is sponsor_accounts.is_pulse_client.
 */

import { isAdminUser, type AdminCheckSubject } from '../auth/is-admin.ts'
import { isPulseResolvedForViewer } from '../sim-viewer/access.ts'
import { isSimReportEnabled } from './flag.ts'

export type SimReportTier = 'summary' | 'full'

export type SimReportEligibilityInput = {
  pulseStatus: string
  runRevealedAt: string | null
  runIsFixture: boolean
  isAdmin: boolean
}

export type SimReportFullAccessInput = {
  isAdmin: boolean
  /** True when any linked active sponsor_accounts.is_pulse_client. */
  isPulseClient: boolean
  userEmail?: string | null
}

function isRevealed(revealedAt: string | null): boolean {
  return typeof revealedAt === 'string' && revealedAt.length > 0
}

/** Parse SIM_REPORT_FULL_ALLOWLIST (comma-separated emails). */
export function parseFullReportAllowlist(
  raw: string | undefined = process.env.SIM_REPORT_FULL_ALLOWLIST,
): Set<string> {
  const set = new Set<string>()
  if (!raw) return set
  for (const part of raw.split(',')) {
    const email = part.trim().toLowerCase()
    if (email.length > 0) set.add(email)
  }
  return set
}

export function isOnFullReportAllowlist(
  email: string | null | undefined,
  allowlist: Set<string> = parseFullReportAllowlist(),
): boolean {
  if (!email) return false
  return allowlist.has(email.trim().toLowerCase())
}

/**
 * Whether the Pulse + run pair qualifies for a public/admin report download
 * (ignoring paid-tier checks). Flag must be on.
 */
export function isReportEligible(input: SimReportEligibilityInput): boolean {
  if (!isSimReportEnabled()) return false
  if (input.isAdmin) {
    // Admins may pull reports for any revealed-or-complete fixture/open run
    // once the flag is on — useful for QA. Still require a revealed_at OR
    // fixture so we never invent a "closed" story for a half-run.
    if (input.runIsFixture) return true
    return isRevealed(input.runRevealedAt)
  }
  if (!isPulseResolvedForViewer(input.pulseStatus)) return false
  if (!isRevealed(input.runRevealedAt)) return false
  if (input.runIsFixture) return false
  return true
}

/** Who may download the FULL tier. */
export function canDownloadFullReport(input: SimReportFullAccessInput): boolean {
  if (input.isAdmin) return true
  if (input.isPulseClient) return true
  if (isOnFullReportAllowlist(input.userEmail)) return true
  return false
}

export function decideReportAccess(args: {
  tier: SimReportTier
  eligibility: SimReportEligibilityInput
  fullAccess: SimReportFullAccessInput
}): { allow: true } | { allow: false; reason: 'disabled' | 'ineligible' | 'forbidden' } {
  if (!isSimReportEnabled()) return { allow: false, reason: 'disabled' }
  if (!isReportEligible(args.eligibility)) {
    return { allow: false, reason: 'ineligible' }
  }
  if (args.tier === 'summary') return { allow: true }
  if (!canDownloadFullReport(args.fullAccess)) {
    return { allow: false, reason: 'forbidden' }
  }
  return { allow: true }
}

/** Helper for route handlers that already resolved the user profile. */
export function subjectIsAdmin(subject: AdminCheckSubject): boolean {
  return isAdminUser(subject)
}
