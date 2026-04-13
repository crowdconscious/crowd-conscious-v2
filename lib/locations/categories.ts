/**
 * Conscious Locations — category values (DB CHECK) + labels for UI/email.
 */

export const LOCATION_CATEGORY_DEFS = [
  { value: 'all', label: { es: 'Todos', en: 'All' } },
  { value: 'restaurant', label: { es: 'Restaurantes', en: 'Restaurants' } },
  { value: 'bar', label: { es: 'Bares', en: 'Bars' } },
  { value: 'cafe', label: { es: 'Cafés', en: 'Cafés' } },
  { value: 'hotel', label: { es: 'Hoteles', en: 'Hotels' } },
  { value: 'mezcaleria', label: { es: 'Mezcalerías', en: 'Mezcalerías' } },
  { value: 'rooftop', label: { es: 'Rooftops', en: 'Rooftops' } },
  { value: 'club', label: { es: 'Clubs', en: 'Clubs' } },
  { value: 'coworking', label: { es: 'Coworking', en: 'Coworking' } },
  { value: 'gallery', label: { es: 'Galerías', en: 'Galleries' } },
  { value: 'festival', label: { es: 'Festivales', en: 'Festivals' } },
  { value: 'artist', label: { es: 'Artistas', en: 'Artists' } },
  { value: 'market', label: { es: 'Mercados', en: 'Markets' } },
  { value: 'food_truck', label: { es: 'Food Trucks', en: 'Food Trucks' } },
  { value: 'store', label: { es: 'Tiendas', en: 'Stores' } },
  { value: 'brand', label: { es: 'Marcas', en: 'Brands' } },
  { value: 'gym', label: { es: 'Gimnasios', en: 'Gyms' } },
  { value: 'spa', label: { es: 'Spa & Bienestar', en: 'Spa & Wellness' } },
  { value: 'nonprofit', label: { es: 'ONGs', en: 'Nonprofits' } },
  { value: 'venue', label: { es: 'Venues', en: 'Venues' } },
  { value: 'influencer', label: { es: 'Influencers', en: 'Influencers' } },
  { value: 'other', label: { es: 'Otros', en: 'Other' } },
] as const

const LABEL_BY_VALUE = new Map<string, { es: string; en: string }>(
  LOCATION_CATEGORY_DEFS.filter((c) => c.value !== 'all').map((c) => [c.value, c.label])
)

export function locationCategoryLabel(
  value: string,
  locale: 'es' | 'en'
): string {
  const row = LABEL_BY_VALUE.get(value)
  if (row) return locale === 'es' ? row.es : row.en
  return value.replace(/_/g, ' ')
}

/** Option B: only pills for categories that appear in the current location set (+ Todos). Preserves marketing order. */
export function visibleLocationCategoryFilters(activeCategoryValues: Set<string>) {
  const rest = LOCATION_CATEGORY_DEFS.filter(
    (c) => c.value !== 'all' && activeCategoryValues.has(c.value)
  )
  return [{ value: 'all' as const, label: LOCATION_CATEGORY_DEFS[0].label }, ...rest]
}

/** Admin / forms — all non-all options in a stable order */
export const LOCATION_CATEGORY_FORM_OPTIONS = LOCATION_CATEGORY_DEFS.filter((c) => c.value !== 'all')

/** Singular Spanish labels for admin dropdown (matches product copy). */
export const LOCATION_CATEGORY_ADMIN_LABEL_ES: Record<string, string> = {
  restaurant: 'Restaurante',
  bar: 'Bar',
  cafe: 'Café',
  hotel: 'Hotel',
  mezcaleria: 'Mezcalería',
  rooftop: 'Rooftop',
  club: 'Club',
  coworking: 'Coworking',
  gallery: 'Galería',
  festival: 'Festival',
  artist: 'Artista',
  market: 'Mercado',
  food_truck: 'Food Truck',
  store: 'Tienda',
  brand: 'Marca',
  gym: 'Gimnasio',
  spa: 'Spa & Bienestar',
  nonprofit: 'ONG',
  venue: 'Venue',
  influencer: 'Influencer',
  other: 'Otro',
}
