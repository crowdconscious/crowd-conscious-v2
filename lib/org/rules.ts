/**
 * Field rules per client (admin-set on `orgs`) and the Sello rule.
 * Defaults (Francisco, 14 Oct 2026): no extension; early close allowed but the
 * reading is marked preliminary under MIN_RESPONSES_FOR_HEADLINE.
 */
import { MIN_RESPONSES_FOR_HEADLINE } from './firmness'

export type OrgRules = { maxExtensionDays: number; allowEarlyClose: boolean; seatLimit: number }
export const DEFAULT_RULES: OrgRules = { maxExtensionDays: 0, allowEarlyClose: true, seatLimit: 10 }

export type FieldState = { status: 'design' | 'field' | 'closed'; fieldCloses: string | null; extendedDays: number; responded: number }

export function canExtend(rules: OrgRules, s: FieldState, days: number, now = Date.now()) {
  if (s.status !== 'field' || !s.fieldCloses) return { ok: false as const, reason: 'not_in_field' }
  if (new Date(s.fieldCloses).getTime() <= now) return { ok: false as const, reason: 'already_closed' }
  if (!Number.isInteger(days) || days < 1) return { ok: false as const, reason: 'bad_days' }
  if (s.extendedDays + days > rules.maxExtensionDays) return { ok: false as const, reason: 'over_limit' }
  return { ok: true as const }
}

export function canCloseEarly(rules: OrgRules, s: FieldState) {
  if (s.status !== 'field') return { ok: false as const, reason: 'not_in_field' }
  if (!rules.allowEarlyClose) return { ok: false as const, reason: 'not_allowed' }
  return { ok: true as const, preliminary: s.responded < MIN_RESPONSES_FOR_HEADLINE }
}

/**
 * Visibility (public/private) is the client's choice and can change at any
 * time, in any status (Francisco, 14 Oct 2026). Every change is logged in
 * org_reading_events ('visibility_set' with from/to). The Sello follows it
 * immediately because selloEarned() is computed on every request.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const canSetVisibility = (_status: FieldState['status']) => true

/**
 * Sello: earned automatically while the client is paying (billing active) and
 * at least one closed reading is public. No other criteria. It disappears as
 * soon as billing stops or no closed reading is public.
 */
export function selloEarned(billingStatus: 'active' | 'inactive', readings: { status: string; visibility: string }[]) {
  return billingStatus === 'active' && readings.some((r) => r.status === 'closed' && r.visibility === 'public')
}
