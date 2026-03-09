/**
 * Get translated market text based on locale.
 * Falls back to the original Spanish field if no translation exists.
 */

type TranslatableMarketField = 'title' | 'description' | 'resolution_criteria'

interface MarketWithTranslations {
  title: string
  description?: string | null
  resolution_criteria?: string | null
  translations?: {
    en?: {
      title?: string
      description?: string
      resolution_criteria?: string
    }
    [key: string]: Record<string, string> | undefined
  } | null
}

interface OutcomeWithTranslations {
  label: string
  translations?: {
    en?: {
      label?: string
    }
    [key: string]: Record<string, string> | undefined
  } | null
}

export function getMarketText(
  market: MarketWithTranslations,
  field: TranslatableMarketField,
  locale: string
): string {
  // If locale is Spanish or default, return original
  if (!locale || locale === 'es') {
    return market[field] || ''
  }

  // Try to get translation for the requested locale
  const translation = market.translations?.[locale]?.[field]
  if (translation) {
    return translation
  }

  // Fallback to original Spanish
  return market[field] || ''
}

export function getOutcomeLabel(
  outcome: { label: string; translations?: unknown },
  locale: string
): string {
  if (!locale || locale === 'es') {
    return outcome.label
  }

  const translation = (outcome.translations as Record<string, { label?: string }> | null | undefined)?.[locale]?.label
  if (translation) {
    return translation
  }

  // Auto-translate common outcome labels
  const autoTranslations: Record<string, Record<string, string>> = {
    en: {
      Sí: 'Yes',
      No: 'No',
      México: 'Mexico',
      'Corea del Sur': 'South Korea',
      Sudáfrica: 'South Africa',
    },
  }

  return autoTranslations[locale]?.[outcome.label] || outcome.label
}

// Helper to check if a market has translations for a given locale
export function hasTranslation(
  market: MarketWithTranslations,
  locale: string
): boolean {
  return !!market.translations?.[locale]?.title
}
