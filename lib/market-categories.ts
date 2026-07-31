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

/** Default Pulse duration in days when a creator does not pick one. */
export const PULSE_DEFAULT_DURATION_DAYS = 30

/** Duration presets offered in the create forms (custom = explicit date). */
export const PULSE_DURATION_PRESETS = [7, 14, 30] as const

/**
 * Closing horizon for a Pulse. Pulses must end so the auto-resolver can fire, so
 * we default to 30 days out (was +1 year, which meant they never closed). Callers
 * may pass 7/14/30 or a custom day count. Returns an ISO string (RPC requires a value).
 */
export function pulseDefaultEndDateIso(days: number = PULSE_DEFAULT_DURATION_DAYS): string {
  const safeDays = Number.isFinite(days) && days > 0 ? days : PULSE_DEFAULT_DURATION_DAYS
  const d = new Date()
  d.setDate(d.getDate() + safeDays)
  return d.toISOString()
}

/**
 * Resolve the Pulse close date from create-form input, validating it is in the future.
 * Accepts either an explicit ISO `end_date` (custom) or a `duration_days` preset;
 * falls back to the 30-day default when neither is provided. Returns `{ error }`
 * when the supplied date is invalid or not in the future so callers can 400.
 */
export function resolvePulseEndDateIso(input: {
  end_date?: unknown
  duration_days?: unknown
}): { iso: string } | { error: string } {
  if (typeof input.end_date === 'string' && input.end_date.trim()) {
    const parsed = new Date(input.end_date.trim())
    if (Number.isNaN(parsed.getTime())) {
      return { error: 'Fecha de cierre inválida' }
    }
    if (parsed.getTime() <= Date.now()) {
      return { error: 'La fecha de cierre debe estar en el futuro' }
    }
    return { iso: parsed.toISOString() }
  }

  if (input.duration_days !== undefined && input.duration_days !== null) {
    const days = Number(input.duration_days)
    if (!Number.isFinite(days) || days <= 0) {
      return { error: 'Duración inválida' }
    }
    return { iso: pulseDefaultEndDateIso(days) }
  }

  return { iso: pulseDefaultEndDateIso() }
}

/** Server-side fallback when creation forms omit resolution criteria. */
export const PULSE_DEFAULT_RESOLUTION_CRITERIA =
  'Consulta de sentimiento público. Los resultados se presentan al cierre del Pulse con análisis ponderado por nivel de certeza de la comunidad.'
