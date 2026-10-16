/**
 * Lugar Consciente: free, earned seal (NOT the paid Sello verificado).
 * Pure rules, shared by the cron, the progress page and tests.
 * Decisions (Francisco, 16 Oct 2026):
 *  - Distribution: within a rolling 8 weeks, >= 4 distinct weeks with >= 3
 *    distinct voters each, and >= 25 distinct voters in total, attributed to
 *    the place's ?src= slug. Owner excluded; max 2 voters per ip_hash per week.
 *  - Values: ONE acceptance of all 7 values together (a pledge to live by
 *    them, not audited compliance). Recorded with signer, time, version, ip hash.
 *  - Reviewed yearly. Paying Sello verificado clients get it automatically
 *    (awarded_by = 'auto_paid') once their values pledge is accepted.
 */

export const WINDOW_WEEKS = 8
export const MIN_WEEKS = 4
export const MIN_VOTERS_PER_WEEK = 3
export const MIN_TOTAL_VOTERS = 25
export const MAX_VOTERS_PER_IP_PER_WEEK = 2
export const AWARD_MONTHS = 12
export const RENEWAL_NOTICE_DAYS = 30

/** Bump when the values text changes; older pledges then need re-acceptance at renewal. */
export const VALUES_VERSION = '2026-10'

export type ValueKey = 'escucha' | 'transparencia' | 'accion' | 'entorno' | 'comunidad' | 'inclusion' | 'difusion'

/** Our 7 values. The 7 stars on the Lugar Consciente badge are these, left to right. */
export const VALUES: { key: ValueKey; es: string; en: string; descEs: string; descEn: string }[] = [
  { key: 'escucha', es: 'Escucha', en: 'Listening', descEs: 'Preguntamos y tomamos en cuenta lo que opina nuestra comunidad.', descEn: 'We ask, and we take our community’s views into account.' },
  { key: 'transparencia', es: 'Transparencia', en: 'Transparency', descEs: 'Compartimos lo que hacemos y por qué, sin esconder lo incómodo.', descEn: 'We share what we do and why, including the uncomfortable parts.' },
  { key: 'accion', es: 'Acción', en: 'Action', descEs: 'Convertimos lo que escuchamos en pasos concretos.', descEn: 'We turn what we hear into concrete steps.' },
  { key: 'entorno', es: 'Cuidado del entorno', en: 'Care for the environment', descEs: 'Cuidamos el espacio, los recursos y el barrio que compartimos.', descEn: 'We care for the space, resources and neighborhood we share.' },
  { key: 'comunidad', es: 'Comunidad local', en: 'Local community', descEs: 'Apoyamos a la gente y los negocios de nuestra zona.', descEn: 'We support the people and businesses around us.' },
  { key: 'inclusion', es: 'Inclusión', en: 'Inclusion', descEs: 'Recibimos a todas las personas con respeto.', descEn: 'We welcome everyone with respect.' },
  { key: 'difusion', es: 'Difusión', en: 'Spreading the word', descEs: 'Invitamos a nuestra comunidad a participar en los Pulsos.', descEn: 'We invite our community to take part in Pulses.' },
]

export type Progress = {
  weeksOk: number
  totalVoters: number
  droppedVoterWeeks: number
  topIpVoters: number
}

/** Suspicion heuristics: the cap had to drop voters, or one network carries > 30% of voters. */
export function suspicionOf(p: Progress): string[] {
  const why: string[] = []
  if (p.droppedVoterWeeks > 0) why.push('ip_cap_hit')
  if (p.totalVoters > 0 && p.topIpVoters / p.totalVoters > 0.3) why.push('ip_concentration')
  return why
}

export type Decision =
  | { kind: 'not_yet'; missing: ('weeks' | 'voters' | 'pledge')[] }
  | { kind: 'award' }
  | { kind: 'pending'; reasons: string[] }

/** What the daily job should do for a place with no open award. */
export function decide(p: Progress, pledgeCurrent: boolean): Decision {
  const missing: ('weeks' | 'voters' | 'pledge')[] = []
  if (p.weeksOk < MIN_WEEKS) missing.push('weeks')
  if (p.totalVoters < MIN_TOTAL_VOTERS) missing.push('voters')
  if (!pledgeCurrent) missing.push('pledge')
  if (missing.length) return { kind: 'not_yet', missing }
  const reasons = suspicionOf(p)
  return reasons.length ? { kind: 'pending', reasons } : { kind: 'award' }
}

/** Award validity: 12 months from activation. */
export function expiryFrom(earnedAt: Date): Date {
  const d = new Date(earnedAt)
  d.setUTCMonth(d.getUTCMonth() + AWARD_MONTHS)
  return d
}

export type AwardLifecycle = 'active' | 'renewal_due' | 'lapse'
export function lifecycleOf(expiresAt: Date, now = new Date()): AwardLifecycle {
  if (expiresAt.getTime() <= now.getTime()) return 'lapse'
  if (expiresAt.getTime() - now.getTime() <= RENEWAL_NOTICE_DAYS * 86400000) return 'renewal_due'
  return 'active'
}

/**
 * Renewal: an active award past expiry is renewed (another 12 months) only if
 * the place re-qualifies in the last 8 weeks AND has a pledge on the current
 * version; otherwise it lapses. Paid (auto_paid) awards renew while billing is active.
 */
export function renewOrLapse(opts: { awardedBy: 'auto' | 'auto_paid' | 'admin'; billingActive?: boolean; progress?: Progress; pledgeCurrent: boolean }): 'renew' | 'lapse' | 'pending' {
  if (!opts.pledgeCurrent) return 'lapse'
  if (opts.awardedBy === 'auto_paid') return opts.billingActive ? 'renew' : 'lapse'
  if (!opts.progress) return 'lapse'
  const d = decide(opts.progress, true)
  return d.kind === 'award' ? 'renew' : d.kind === 'pending' ? 'pending' : 'lapse'
}

/** Attribution slug for a place: qr_<slug>, [a-z0-9._-], max 40 chars (matches market_votes.src sanitizer). */
export function srcSlugFor(slug: string): string {
  const clean = slug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return `qr_${clean}`.slice(0, 40).replace(/[-._]+$/, '')
}

/** Statuses that come through the Conscious Locations flow and may join the program. */
export const PROGRAM_LOCATION_STATUSES = ['pending', 'active', 'under_review'] as const
export function locationCanJoin(status: string): boolean {
  return (PROGRAM_LOCATION_STATUSES as readonly string[]).includes(status)
}
