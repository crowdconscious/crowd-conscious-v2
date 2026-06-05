/** Allowed `prediction_markets.category` values (must match DB CHECK constraint). */
export const MARKET_CATEGORY_IDS = [
  'world_cup',
  'world',
  'pulse',
  'government',
  'geopolitics',
  'sustainability',
  'technology',
  'economy',
  'corporate',
  'community',
  'cause',
  'entertainment',
] as const

export type MarketCategoryId = (typeof MARKET_CATEGORY_IDS)[number]

const SET = new Set<string>(MARKET_CATEGORY_IDS)

export function isValidMarketCategory(id: string): id is MarketCategoryId {
  return SET.has(id)
}

/**
 * Curated topic categories for Pulse creation forms.
 * Excludes legacy `pulse` (product flag, not a topic), sports (`world_cup`),
 * and entertainment (not aligned with civic sentiment use cases).
 */
export const PULSE_FORM_CATEGORY_IDS = [
  'economy',
  'government',
  'geopolitics',
  'world',
  'community',
  'cause',
  'sustainability',
  'technology',
  'corporate',
] as const

export type PulseFormCategoryId = (typeof PULSE_FORM_CATEGORY_IDS)[number]

/** Bilingual display labels for market/pulse topic categories. */
export const PULSE_CATEGORY_LABELS: Record<MarketCategoryId, { es: string; en: string }> = {
  economy: { es: 'Economía', en: 'Economy' },
  government: { es: 'Política y gobierno', en: 'Politics & government' },
  geopolitics: { es: 'Geopolítica', en: 'Geopolitics' },
  world: { es: 'Asuntos globales', en: 'World affairs' },
  community: { es: 'Comunidad y civismo', en: 'Community & civic' },
  cause: { es: 'Causas sociales', en: 'Social causes' },
  sustainability: { es: 'Sostenibilidad', en: 'Sustainability' },
  technology: { es: 'Tecnología', en: 'Technology' },
  corporate: { es: 'Empresas y mercados', en: 'Business & markets' },
  pulse: { es: 'Pulse', en: 'Pulse' },
  world_cup: { es: 'Mundial', en: 'World Cup' },
  entertainment: { es: 'Entretenimiento', en: 'Entertainment' },
}

export function getPulseCategoryLabel(id: string, locale: 'es' | 'en' = 'es'): string {
  const row = PULSE_CATEGORY_LABELS[id as MarketCategoryId]
  return row?.[locale] ?? id.replace(/_/g, ' ')
}

export const PULSE_FORM_CATEGORIES = PULSE_FORM_CATEGORY_IDS.map((id) => ({
  id,
  labelEs: PULSE_CATEGORY_LABELS[id].es,
  labelEn: PULSE_CATEGORY_LABELS[id].en,
}))

/** Default closing horizon when admins/sponsors do not set a date (RPC requires a value). */
export function pulseDefaultEndDateIso(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString()
}

/** Server-side fallback when creation forms omit resolution criteria. */
export const PULSE_DEFAULT_RESOLUTION_CRITERIA =
  'Consulta de sentimiento público. Los resultados se presentan al cierre del Pulse con análisis ponderado por nivel de certeza de la comunidad.'
