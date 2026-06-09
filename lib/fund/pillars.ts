/**
 * Conscious Fund pillars — shared between the Stripe webhook (which tags each
 * 20% contribution to a pillar) and the Sponsored Signals UI (which renders the
 * transparency line on the badge).
 *
 * The five canonical pillars match the CHECK constraint in
 * supabase/migrations/233_monetization_core.sql (conscious_fund_contributions)
 * and 235_sponsored_signals.sql (signal_sponsorships.fund_pillar).
 */

export const FUND_PILLARS = [
  'clean_air',
  'clean_water',
  'safe_cities',
  'zero_waste',
  'fair_trade',
] as const

export type FundPillar = (typeof FUND_PILLARS)[number]

export function isFundPillar(value: unknown): value is FundPillar {
  return (
    typeof value === 'string' && (FUND_PILLARS as readonly string[]).includes(value)
  )
}

/**
 * Map a Citizen Signal category (see lib/i18n/citizen-signals.ts
 * SIGNAL_CATEGORIES — 16 free-text values) to a fund pillar.
 *
 * ASSUMPTION (flagged to the founder): the signal taxonomy and the fund
 * pillar taxonomy were authored independently, so this mapping is a best-effort
 * editorial choice, not a schema-enforced relation. Anything that does not map
 * cleanly falls back to `safe_cities` (the broadest civic-infrastructure
 * pillar). Adjust here if the founder wants a different bucketing.
 */
export function signalCategoryToPillar(category: string | null | undefined): FundPillar {
  switch (category) {
    case 'environment':
    case 'mobility_transport':
    case 'noise_pollution':
      return 'clean_air'
    case 'water_sanitation':
      return 'clean_water'
    case 'consumer_protection':
    case 'corruption_ethics':
    case 'animal_welfare':
      return 'fair_trade'
    case 'public_space':
    case 'safety_security':
    case 'accessibility':
    case 'gender_rights':
    case 'housing':
    case 'education':
    case 'public_health':
    case 'culture_sport':
    case 'other':
    default:
      return 'safe_cities'
  }
}

/** Bilingual human label for a pillar (used on the transparency line). */
export function fundPillarLabel(pillar: FundPillar, locale: 'es' | 'en'): string {
  const map: Record<FundPillar, [string, string]> = {
    clean_air: ['Aire Limpio', 'Clean Air'],
    clean_water: ['Agua Limpia', 'Clean Water'],
    safe_cities: ['Ciudades Seguras', 'Safe Cities'],
    zero_waste: ['Cero Residuos', 'Zero Waste'],
    fair_trade: ['Comercio Justo', 'Fair Trade'],
  }
  return map[pillar][locale === 'es' ? 0 : 1]
}
