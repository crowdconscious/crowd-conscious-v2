/**
 * Canonical blog post categories.
 *
 * IDs must match the `blog_posts.category` DB CHECK constraint
 * (migration 168, extended in 243). IDs are stable DB values — never rename
 * them; only labels change. `market_story` keeps its historical key but is
 * displayed with Pulse-first language ("Historia de Pulse" / "Pulse story").
 */
export const BLOG_CATEGORY_IDS = [
  'insight',
  'pulse_analysis',
  'market_story',
  'world_cup',
  'behind_data',
  'sustainability',
  'city_mobility',
  'civic_culture',
  'conscious_places',
  'creators',
  'causes_fund',
] as const

export type BlogCategoryId = (typeof BLOG_CATEGORY_IDS)[number]

const SET = new Set<string>(BLOG_CATEGORY_IDS)

export function isValidBlogCategory(id: string): id is BlogCategoryId {
  return SET.has(id)
}

export const BLOG_CATEGORY_LABELS: Record<BlogCategoryId, { es: string; en: string }> = {
  insight: { es: 'Insight', en: 'Insight' },
  pulse_analysis: { es: 'Análisis Pulse', en: 'Pulse analysis' },
  market_story: { es: 'Historia de Pulse', en: 'Pulse story' },
  world_cup: { es: 'Mundial', en: 'World Cup' },
  behind_data: { es: 'Detrás de los datos', en: 'Behind the data' },
  sustainability: { es: 'Sostenibilidad', en: 'Sustainability' },
  city_mobility: { es: 'Ciudad y movilidad', en: 'City & mobility' },
  civic_culture: { es: 'Cultura cívica', en: 'Civic culture' },
  conscious_places: { es: 'Lugares Conscientes', en: 'Conscious Places' },
  creators: { es: 'Creadores', en: 'Creators' },
  causes_fund: { es: 'Causas y fondo', en: 'Causes & fund' },
}

export function getBlogCategoryLabel(id: string, locale: 'es' | 'en' = 'es'): string {
  const row = BLOG_CATEGORY_LABELS[id as BlogCategoryId]
  return row?.[locale] ?? id.replace(/_/g, ' ')
}

/** Options for category selects in creation/edit forms. */
export const BLOG_FORM_CATEGORIES = BLOG_CATEGORY_IDS.map((id) => ({
  id,
  labelEs: BLOG_CATEGORY_LABELS[id].es,
  labelEn: BLOG_CATEGORY_LABELS[id].en,
}))
