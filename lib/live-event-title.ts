import type { Json } from '@/types/database'

/**
 * Resolve display title from `live_events.title` + optional `translations` JSONB.
 * Supports flat locale keys (`{ "en": "...", "es": "..." }`) or nested `{ en: { title } }`.
 */
export function getLiveEventTitle(
  row: { title: string; translations?: Json | null },
  locale: string
): string {
  const t = row.translations
  if (t && typeof t === 'object' && !Array.isArray(t)) {
    const o = t as Record<string, unknown>
    const direct = o[locale]
    if (typeof direct === 'string') return direct
    const fallback = o.es ?? o.en
    if (typeof fallback === 'string') return fallback
    for (const v of Object.values(o)) {
      if (typeof v === 'string') return v
      if (v && typeof v === 'object' && 'title' in v && typeof (v as { title?: unknown }).title === 'string') {
        return (v as { title: string }).title
      }
    }
  }
  return row.title
}
