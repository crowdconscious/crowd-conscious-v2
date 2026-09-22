/**
 * Civic reputation domains + signal-category mapping (UX overhaul §3.6).
 *
 * Domains from day one: Agua, espacio público, residuos, desarrollo urbano.
 * Signal categories are broader — this map is editorial, same spirit as
 * signalCategoryToPillar in lib/fund/pillars.ts.
 */

export const CIVIC_REPUTATION_DOMAINS = [
  'agua',
  'espacio_publico',
  'residuos',
  'desarrollo_urbano',
] as const

export type CivicReputationDomain = (typeof CIVIC_REPUTATION_DOMAINS)[number]

export const CIVIC_REPUTATION_REASONS = [
  'signal_cosign_stage_50',
  'signal_cosign_stage_200',
  'signal_author_cosigned',
  'signal_author_stage_50',
  'signal_author_stage_200',
  'location_evaluated',
  'neighbour_participated',
  'sustained_presence',
] as const

export type CivicReputationReason = (typeof CIVIC_REPUTATION_REASONS)[number]

/** Default points per allowed reason. Modest — insight is the reward, not XP. */
export const CIVIC_REPUTATION_POINTS: Record<CivicReputationReason, number> = {
  signal_cosign_stage_50: 5,
  signal_cosign_stage_200: 10,
  signal_author_cosigned: 3,
  signal_author_stage_50: 8,
  signal_author_stage_200: 15,
  location_evaluated: 4,
  neighbour_participated: 5,
  sustained_presence: 2,
}

export function isCivicReputationDomain(
  value: string
): value is CivicReputationDomain {
  return (CIVIC_REPUTATION_DOMAINS as readonly string[]).includes(value)
}

/**
 * Map a Citizen Signal category → civic reputation domain.
 * Fallback: desarrollo_urbano (broadest civic-built-environment bucket).
 */
export function signalCategoryToReputationDomain(
  category: string | null | undefined
): CivicReputationDomain {
  switch (category) {
    case 'water_sanitation':
      return 'agua'
    case 'public_space':
    case 'accessibility':
    case 'noise_pollution':
    case 'safety_security':
    case 'culture_sport':
      return 'espacio_publico'
    case 'environment':
    case 'animal_welfare':
    case 'public_health':
      return 'residuos'
    case 'housing':
    case 'mobility_transport':
    case 'education':
    case 'corruption_ethics':
    case 'consumer_protection':
    case 'gender_rights':
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

export function civicReputationReasonLabel(
  reason: CivicReputationReason,
  locale: 'es' | 'en'
): string {
  const map: Record<CivicReputationReason, [string, string]> = {
    signal_cosign_stage_50: [
      'Respaldo que alcanzó el primer umbral',
      'Co-sign that reached the first stage',
    ],
    signal_cosign_stage_200: [
      'Respaldo que alcanzó el segundo umbral',
      'Co-sign that reached the second stage',
    ],
    signal_author_cosigned: [
      'Señal publicada que otros respaldaron',
      'Published señal others co-signed',
    ],
    signal_author_stage_50: [
      'Tu señal alcanzó el primer umbral',
      'Your señal reached the first stage',
    ],
    signal_author_stage_200: [
      'Tu señal alcanzó el segundo umbral',
      'Your señal reached the second stage',
    ],
    location_evaluated: [
      'Evaluaste un lugar',
      'You evaluated a location',
    ],
    neighbour_participated: [
      'Un vecino participó gracias a ti',
      'A neighbour participated because of you',
    ],
    sustained_presence: [
      'Presencia sostenida este mes',
      'Sustained presence this month',
    ],
  }
  return map[reason][locale === 'es' ? 0 : 1]
}

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
