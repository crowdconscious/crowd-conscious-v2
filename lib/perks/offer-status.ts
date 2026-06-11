import type { LocationOfferRow, LocationOfferStatus } from './types'

/** True when an offer should appear on the public location page. */
export function isOfferPubliclyVisible(offer: Pick<LocationOfferRow, 'status' | 'valid_from' | 'valid_until'>): boolean {
  if (offer.status !== 'active') return false
  const now = Date.now()
  if (offer.valid_from && new Date(offer.valid_from).getTime() > now) return false
  if (offer.valid_until && new Date(offer.valid_until).getTime() < now) return false
  return true
}

export function stockRemaining(offer: Pick<LocationOfferRow, 'stock_limit' | 'redeemed_count'>): number | null {
  if (offer.stock_limit == null) return null
  return Math.max(0, offer.stock_limit - offer.redeemed_count)
}

export function isOfferInStock(offer: Pick<LocationOfferRow, 'stock_limit' | 'redeemed_count'>): boolean {
  const remaining = stockRemaining(offer)
  return remaining === null || remaining > 0
}

export function offerTitle(
  offer: Pick<LocationOfferRow, 'title' | 'title_en'>,
  locale: 'es' | 'en'
): string {
  if (locale === 'en') return offer.title_en?.trim() || offer.title
  return offer.title
}

export function offerDescription(
  offer: Pick<LocationOfferRow, 'description' | 'description_en'>,
  locale: 'es' | 'en'
): string | null {
  if (locale === 'en') return offer.description_en?.trim() || offer.description
  return offer.description
}

export const OFFER_STATUS_LABELS: Record<
  LocationOfferStatus,
  { es: string; en: string }
> = {
  draft: { es: 'Borrador', en: 'Draft' },
  active: { es: 'Activa', en: 'Active' },
  paused: { es: 'Pausada', en: 'Paused' },
  expired: { es: 'Expirada', en: 'Expired' },
}
