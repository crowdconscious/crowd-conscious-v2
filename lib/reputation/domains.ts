/**
 * Civic reputation domains + signal-category mapping (UX overhaul §3.6).
 *
 * Canonical schema = mobile `20260922_civic_reputation.sql` (shared Supabase).
 * Domains from day one: Agua, espacio público, residuos, desarrollo urbano.
 * See docs/PHASE-3-CIVIC-REPUTATION.md.
 */

export const CIVIC_REPUTATION_DOMAINS = [
  'agua',
  'espacio_publico',
  'residuos',
  'desarrollo_urbano',
] as const

export type CivicReputationDomain = (typeof CIVIC_REPUTATION_DOMAINS)[number]

/** Mobile-canonical action_type values on civic_reputation_events. */
export const CIVIC_REPUTATION_ACTION_TYPES = [
  'signal_stage_cosign',
  'signal_author_cosigned',
  'location_evaluation',
  'neighbor_participation',
  'sustained_presence',
] as const

export type CivicReputationActionType =
  (typeof CIVIC_REPUTATION_ACTION_TYPES)[number]

/** Default points for app-layer awards (neighbor / sustained). DB triggers use their own amounts. */
export const CIVIC_REPUTATION_POINTS: Partial<
  Record<CivicReputationActionType, number>
> = {
  neighbor_participation: 5,
  sustained_presence: 2,
}

export function isCivicReputationDomain(
  value: string
): value is CivicReputationDomain {
  return (CIVIC_REPUTATION_DOMAINS as readonly string[]).includes(value)
}

/**
 * Map a Citizen Signal category → civic reputation domain.
 * Aligns with mobile `civic_reputation_map_domain` spirit; fallback desarrollo_urbano.
 */
export function signalCategoryToReputationDomain(
  category: string | null | undefined
): CivicReputationDomain {
  switch (category) {
    case 'water_sanitation':
    case 'agua':
    case 'public_health':
      return 'agua'
    case 'public_space':
    case 'banqueta':
    case 'bache':
    case 'luminaria':
    case 'arbol':
    case 'accessibility':
    case 'noise_pollution':
    case 'culture_sport':
    case 'animal_welfare':
      return 'espacio_publico'
    case 'environment':
    case 'basura':
    case 'residuos':
      return 'residuos'
    case 'housing':
    case 'mobility_transport':
    case 'education':
    case 'corruption_ethics':
    case 'consumer_protection':
    case 'gender_rights':
    case 'safety_security':
    case 'other':
    default:
      return 'desarrollo_urbano'
  }
}

/** Location evaluations default to espacio público (place/street layer). */
export function locationEvaluationDomain(): CivicReputationDomain {
  return 'espacio_publico'
}

export function civicReputationDomainLabel(
  domain: CivicReputationDomain,
  locale: 'es' | 'en'
): string {
  const map: Record<CivicReputationDomain, [string, string]> = {
    agua: ['Agua', 'Water'],
    espacio_publico: ['Espacio público', 'Public space'],
    residuos: ['Residuos', 'Waste'],
    desarrollo_urbano: ['Desarrollo urbano', 'Urban development'],
  }
  return map[domain][locale === 'es' ? 0 : 1]
}

export function civicReputationActionLabel(
  actionType: CivicReputationActionType,
  locale: 'es' | 'en'
): string {
  const map: Record<CivicReputationActionType, [string, string]> = {
    signal_stage_cosign: [
      'Respaldo que alcanzó un umbral',
      'Co-sign that reached a stage',
    ],
    signal_author_cosigned: [
      'Señal publicada que otros respaldaron',
      'Published señal others co-signed',
    ],
    location_evaluation: [
      'Evaluaste un lugar',
      'You evaluated a location',
    ],
    neighbor_participation: [
      'Un vecino participó gracias a ti',
      'A neighbour participated because of you',
    ],
    sustained_presence: [
      'Presencia sostenida este mes',
      'Sustained presence this month',
    ],
  }
  return map[actionType][locale === 'es' ? 0 : 1]
}

/** @deprecated Use civicReputationActionLabel — kept for any leftover imports. */
export const civicReputationReasonLabel = civicReputationActionLabel

/** Feature flag — off by default until Francisco enables in Vercel. */
export function isCivicReputationEnabled(): boolean {
  return process.env.CIVIC_REPUTATION_ENABLED?.trim().toLowerCase() === 'true'
}

/** Client-visible nav flag (mirrors server). */
export function isCivicReputationPublicEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_CIVIC_REPUTATION_ENABLED?.trim().toLowerCase() ===
    'true'
  )
}

/** LEADERBOARD_ENABLED stays false — public XP/accuracy ranking stays dark. */
export function isLeaderboardEnabled(): boolean {
  return process.env.LEADERBOARD_ENABLED?.trim().toLowerCase() === 'true'
}

export function isLeaderboardPublicEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_LEADERBOARD_ENABLED?.trim().toLowerCase() === 'true'
  )
}
