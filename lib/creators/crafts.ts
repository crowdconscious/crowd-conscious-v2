/**
 * Conscious Creators — fixed craft taxonomy with ES/EN labels.
 *
 * Modeled on lib/locations/categories.ts. The DB columns
 * (creator_certifications.craft / craft_en) store the display labels, not
 * the key, so the column pair stays a plain i18n pair like the locations
 * schema; this list drives the admin form select. 'other' is the escape
 * hatch — the admin types free-text labels for both languages.
 */

export const CREATOR_CRAFT_DEFS = [
  { value: 'chef', label: { es: 'Chef', en: 'Chef' } },
  { value: 'muralist', label: { es: 'Muralista', en: 'Muralist' } },
  { value: 'musician', label: { es: 'Músico/a', en: 'Musician' } },
  { value: 'visual_artist', label: { es: 'Artista visual', en: 'Visual artist' } },
  { value: 'designer', label: { es: 'Diseñador/a', en: 'Designer' } },
  { value: 'photographer', label: { es: 'Fotógrafo/a', en: 'Photographer' } },
  { value: 'writer', label: { es: 'Escritor/a', en: 'Writer' } },
  { value: 'activist', label: { es: 'Activista', en: 'Activist' } },
  { value: 'founder', label: { es: 'Fundador/a', en: 'Founder' } },
  { value: 'content_creator', label: { es: 'Creador/a de contenido', en: 'Content creator' } },
  { value: 'educator', label: { es: 'Educador/a', en: 'Educator' } },
  { value: 'artisan', label: { es: 'Artesano/a', en: 'Artisan' } },
  { value: 'other', label: { es: 'Otro', en: 'Other' } },
] as const

export type CreatorCraftValue = (typeof CREATOR_CRAFT_DEFS)[number]['value']

/** Admin / forms — every option including 'other'. */
export const CREATOR_CRAFT_FORM_OPTIONS = CREATOR_CRAFT_DEFS

/** Find a craft def whose ES label matches a stored craft column value. */
export function craftDefForLabel(craftEs: string | null): (typeof CREATOR_CRAFT_DEFS)[number] | null {
  if (!craftEs) return null
  return CREATOR_CRAFT_DEFS.find((c) => c.label.es === craftEs) ?? null
}

/** Locale-resolved craft label with cross-language fallback. */
export function creatorCraftLabel(
  craft: string | null,
  craftEn: string | null,
  locale: 'es' | 'en'
): string {
  if (locale === 'es') return craft || craftEn || ''
  return craftEn || craft || ''
}
