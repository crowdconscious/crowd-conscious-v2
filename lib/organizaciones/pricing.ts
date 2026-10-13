/**
 * Crowd Conscious para organizaciones: single source of truth for B2B prices.
 * All amounts are MXN, before IVA. The 20% Fondo Consciente share is computed
 * on the pre-IVA amount (decision: Francisco, Oct 13 2026).
 */
export const IVA_RATE = 0.16
export const FUND_SHARE = 0.2

export const ORG_PRICES = {
  pilot: 39_000,
  annual: 65_000,
  continuousMonthly: 14_500,
  selloMonthlyAddon: 10_000,
} as const

export const PILOT_CREDIT_WINDOW_DAYS = 90

export function ivaBreakdown(subtotalMxn: number) {
  const iva = Math.round(subtotalMxn * IVA_RATE * 100) / 100
  return {
    subtotal: subtotalMxn,
    iva,
    total: Math.round((subtotalMxn + iva) * 100) / 100,
    fund: Math.round(subtotalMxn * FUND_SHARE * 100) / 100,
  }
}

/** Pilot: $39,000 + $6,240 IVA = $45,240 MXN; $7,800 to the Fondo. */
export const PILOT_BREAKDOWN = ivaBreakdown(ORG_PRICES.pilot)

export function formatMxn(n: number, locale: 'es' | 'en' = 'es') {
  return `$${n.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export const ORG_CONTACT_EMAIL = 'francisco@crowdconscious.app'
export const ORG_PILOT_PRODUCT_TYPE = 'org_pilot'
