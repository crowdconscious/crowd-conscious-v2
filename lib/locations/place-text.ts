import {
  CDMX_ALCALDIA_DISPLAY_NAMES,
  isCdmxAlcaldiaSlug,
} from '@/lib/signals/cdmx-alcaldias'

/**
 * Place-field placeholders that must not be treated as real localities.
 * Used for neighborhood/address ingest and civic-reputation display.
 */

const PLACEHOLDER_EXACT = new Set(
  [
    '-',
    '—',
    '–',
    '.',
    '..',
    '...',
    's/n',
    'sn',
    's.n.',
    's.n',
    'n/a',
    'na',
    'none',
    'null',
    'undefined',
    'sin colonia',
    'sin dirección',
    'sin direccion',
    'sin barrio',
  ].map((s) => s.toLowerCase())
)

/** True when text is empty or a known placeholder (e.g. '-', 'S/N'). */
export function isPlaceholderPlaceText(
  raw: string | null | undefined
): boolean {
  if (raw == null) return true
  const trimmed = String(raw).trim()
  if (!trimmed) return true
  const lower = trimmed.toLowerCase()
  if (PLACEHOLDER_EXACT.has(lower)) return true
  // Only punctuation / dashes / whitespace
  if (/^[\s\-–—._/\\|,;:]+$/u.test(trimmed)) return true
  return false
}

/** Trim; return null for empty or placeholder values. */
export function normalizePlaceText(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null
  const trimmed = String(raw).trim()
  if (isPlaceholderPlaceText(trimmed)) return null
  return trimmed
}

/**
 * Display label for civic reputation alcaldía buckets.
 * Missing / placeholder / `locality:-` → localized "Sin alcaldía".
 */
export function formatAlcaldiaLabel(
  label: string | null | undefined,
  slug: string | null | undefined,
  locale: 'es' | 'en'
): string {
  const missing = locale === 'es' ? 'Sin alcaldía' : 'No alcaldía'
  const cleanLabel = normalizePlaceText(label)
  const s = (slug ?? '').trim().toLowerCase()

  if (isCdmxAlcaldiaSlug(s)) {
    return CDMX_ALCALDIA_DISPLAY_NAMES[s]
  }

  if (cleanLabel) return cleanLabel

  if (
    !s ||
    s === 'cdmx' ||
    s === 'locality:-' ||
    s === 'locality:' ||
    s === '-' ||
    s.startsWith('locality:-')
  ) {
    return missing
  }

  if (s.startsWith('locality:')) {
    const rest = s.slice('locality:'.length).replace(/-/g, ' ').trim()
    if (!rest || rest === '-') return missing
    return rest.replace(/\b\w/g, (c) => c.toUpperCase())
  }

  if (s.startsWith('cdmx-')) {
    return s
      .slice(5)
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  return s
}
