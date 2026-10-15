export type Loc = 'es' | 'en'
/** Reports/PDF/CSV: Spanish unless ?lang=en, or the org's own preference when no lang is given. */
export function reportLocale(lang: string | null | undefined, orgLocale?: string | null): Loc {
  if (lang === 'en') return 'en'
  if (lang === 'es') return 'es'
  return orgLocale === 'en' ? 'en' : 'es'
}
/** Full reading id in every download filename. */
export function downloadName(kind: string, slug: string, readingId: string, locale: Loc, ext: 'pdf' | 'csv') {
  return `crowd-conscious-${kind}-${slug}-${readingId}-${locale}.${ext}`
}
