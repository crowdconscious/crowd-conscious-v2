import type { SpendXpErrorCode } from './xp-spend'

export const PERKS_COPY = {
  sectionTitle: { es: 'Conscious Perks', en: 'Conscious Perks' },
  sectionLede: {
    es: 'Beneficios abiertos para todos en este lugar certificado.',
    en: 'Perks open to everyone at this certified location.',
  },
  redeem: { es: 'Canjear', en: 'Redeem' },
  stockLeft: { es: 'disponibles', en: 'left' },
  unlimited: { es: 'Sin límite de stock', en: 'Unlimited stock' },
  noOffers: {
    es: 'Este lugar aún no tiene ofertas publicadas.',
    en: 'This location has no published offers yet.',
  },
  loginToRedeem: {
    es: 'Inicia sesión para canjear',
    en: 'Sign in to redeem',
  },
  insufficientXp: {
    es: 'No disponible por ahora',
    en: 'Not available right now',
  },
  outOfStock: { es: 'Agotado', en: 'Out of stock' },
} as const

export function spendErrorMessage(code: SpendXpErrorCode, locale: 'es' | 'en'): string {
  const messages: Record<SpendXpErrorCode, { es: string; en: string }> = {
    unauthorized: { es: 'Debes iniciar sesión.', en: 'You must be signed in.' },
    offer_not_found: { es: 'Oferta no encontrada.', en: 'Offer not found.' },
    location_not_active: { es: 'El lugar no está certificado.', en: 'Location is not certified.' },
    offer_not_active: { es: 'Esta oferta no está activa.', en: 'This offer is not active.' },
    offer_not_yet_valid: { es: 'Esta oferta aún no está vigente.', en: 'This offer is not valid yet.' },
    offer_expired: { es: 'Esta oferta expiró.', en: 'This offer has expired.' },
    offer_out_of_stock: { es: 'Oferta agotada.', en: 'Offer is out of stock.' },
    tier_too_low: { es: 'Esta oferta no está disponible por ahora.', en: 'This offer is not available right now.' },
    insufficient_xp: { es: 'Esta oferta no está disponible por ahora.', en: 'This offer is not available right now.' },
    user_redemption_cap: { es: 'Ya alcanzaste el límite de canjes para esta oferta.', en: 'You reached the redemption limit for this offer.' },
    code_generation_failed: { es: 'No se pudo generar el código. Intenta de nuevo.', en: 'Could not generate code. Try again.' },
    unknown: { es: 'No se pudo completar el canje.', en: 'Redemption failed.' },
  }
  return messages[code][locale]
}
