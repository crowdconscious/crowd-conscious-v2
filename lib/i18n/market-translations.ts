/**
 * Get translated market text based on locale.
 * Falls back to the original Spanish field if no translation exists.
 */

type TranslatableMarketField = 'title' | 'description' | 'resolution_criteria'

export interface MarketWithTranslations {
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
  /** Optional one-line detail (migration 214). Spanish lives here; other locales in `translations`. */
  subtitle?: string | null
  translations?: {
    en?: {
      label?: string
      subtitle?: string
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

/**
 * Resolve the optional outcome subtitle for a locale.
 *
 * Lookup order:
 *   1. translations.[locale].subtitle (per-locale override)
 *   2. outcome.subtitle column (canonical Spanish, since this product is ES-first)
 *   3. null (no subtitle)
 *
 * Returns null when there is nothing to render — callers should `if (sub)` guard
 * before emitting markup so we don't insert empty `<p>` tags.
 */
export function getOutcomeSubtitle(
  outcome: { subtitle?: string | null; translations?: unknown },
  locale: string
): string | null {
  // Per-locale override wins. We accept either {label,subtitle} object form or
  // the legacy {label} only form — `?.subtitle` resolves to undefined safely.
  const tr = outcome.translations as
    | Record<string, { subtitle?: string | null } | undefined>
    | null
    | undefined
  if (locale && locale !== 'es') {
    const localized = tr?.[locale]?.subtitle
    if (typeof localized === 'string' && localized.trim()) {
      return localized.trim()
    }
  }
  const canonical = outcome.subtitle
  if (typeof canonical === 'string' && canonical.trim()) {
    return canonical.trim()
  }
  return null
}

/** Shorter label for tight UI: use one side of "ES / EN" bilingual strings. */
export function getOutcomeCardLabel(
  outcome: { label: string; translations?: unknown },
  locale: string
): string {
  const full = getOutcomeLabel(outcome, locale)
  if (!full.includes(' / ')) return full
  const parts = full.split(' / ').map((s) => s.trim()).filter(Boolean)
  if (parts.length < 2) return full
  if (!locale || locale === 'es' || locale.startsWith('es')) return parts[0]
  return parts[1] ?? parts[0]
}

// Helper to check if a market has translations for a given locale
export function hasTranslation(
  market: MarketWithTranslations,
  locale: string
): boolean {
  return !!market.translations?.[locale]?.title
}
