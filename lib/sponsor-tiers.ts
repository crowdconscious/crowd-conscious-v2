/** Stripe processing fee estimate (Mexico cards ~3.6%) */
export const STRIPE_FEE_RATE = 0.036

export const SPONSOR_TIERS = {
  starter: {
    id: 'starter' as const,
    name: 'Pulse Sponsor',
    nameEs: 'Patrocinador de Pulse',
    price: 3000,
    fundPercent: 0.2,
    platformPercent: 0.8,
    features: [
      'Logo on one Pulse card + detail page',
      'Link to your website/social',
      '"Sponsored by" badge',
    ],
    featuresEs: [
      'Logo en una tarjeta de Pulse + página de detalle',
      'Enlace a tu sitio web/redes',
      'Insignia "Patrocinado por"',
    ],
  },
  growth: {
    id: 'growth' as const,
    name: 'Category Sponsor',
    nameEs: 'Patrocinador de Categoría',
    price: 10000,
    fundPercent: 0.2,
    platformPercent: 0.8,
    features: [
      'Brand on ALL Pulses in a category',
      'Featured placement on the Pulses list',
      'Sponsor analytics dashboard',
      'Social media shoutout',
    ],
    featuresEs: [
      'Marca en TODOS los Pulses de una categoría',
      'Ubicación destacada en lista de Pulses',
      'Panel de analíticas de patrocinio',
      'Mención en redes sociales',
    ],
  },
  champion: {
    id: 'champion' as const,
    name: 'Impact Partner',
    nameEs: 'Socio de Impacto',
    price: 25000,
    fundPercent: 0.2,
    platformPercent: 0.8,
    features: [
      'All Category Sponsor benefits',
      'Name a cause in the Conscious Fund',
      'Quarterly impact report',
      'Custom branded Pulse(s)',
    ],
    featuresEs: [
      'Todos los beneficios de Categoría',
      'Nombra una causa en el Fondo Consciente',
      'Reporte trimestral de impacto',
      'Pulse(s) personalizados con tu marca',
    ],
  },
  anchor: {
    id: 'anchor' as const,
    name: 'Founding Patron',
    nameEs: 'Patrón Fundador',
    price: 60000,
    fundPercent: 0.2,
    platformPercent: 0.8,
    features: [
      'All Impact Partner benefits',
      'Co-create Pulse strategy',
      'VIP platform analytics',
      'Speaking slot at events',
    ],
    featuresEs: [
      'Todos los beneficios de Socio de Impacto',
      'Co-creación de estrategia de Pulses',
      'Acceso VIP a analíticas',
      'Espacio en eventos de Crowd Conscious',
    ],
  },
} as const

export type SponsorTierId = keyof typeof SPONSOR_TIERS

/** Legacy tier keys stored on older sponsorship rows / sessions */
const LEGACY_TO_CANONICAL: Record<string, SponsorTierId> = {
  market: 'starter',
  category: 'growth',
  impact: 'champion',
  patron: 'anchor',
  starter: 'starter',
  growth: 'growth',
  champion: 'champion',
  anchor: 'anchor',
}

export function normalizeSponsorTierId(raw: string | null | undefined): SponsorTierId {
  const k = (raw || 'starter').toLowerCase()
  if (k in SPONSOR_TIERS) return k as SponsorTierId
  return LEGACY_TO_CANONICAL[k] ?? 'starter'
}

export function getFundPercent(tierId: SponsorTierId): number {
  return SPONSOR_TIERS[tierId].fundPercent
}

/**
 * Split gross payment (MXN) after estimated Stripe fee; remainder split by tier %s.
 */
export function calculateFundAllocation(amountGrossMXN: number, tierId: SponsorTierId) {
  const tier = SPONSOR_TIERS[tierId]
  const stripeFee = amountGrossMXN * STRIPE_FEE_RATE
  const netAmount = amountGrossMXN - stripeFee
  const fundAmount = netAmount * tier.fundPercent
  const platformAmount = netAmount * tier.platformPercent
  return {
    stripeFee,
    netAmount,
    fundAmount,
    platformAmount,
    fundPercent: tier.fundPercent,
    platformPercent: tier.platformPercent,
  }
}

/** Rounded MXN amounts for DB + display */
export function calculateFundAllocationRounded(amountGrossMXN: number, tierId: SponsorTierId) {
  const raw = calculateFundAllocation(amountGrossMXN, tierId)
  return {
    ...raw,
    fundAmountRounded: Math.round(raw.fundAmount),
    platformAmountRounded: Math.round(raw.platformAmount),
    netAmountRounded: Math.round(raw.netAmount),
    stripeFeeRounded: Math.round(raw.stripeFee),
  }
}

export const TIER_DURATION_MONTHS: Record<SponsorTierId, number> = {
  starter: 3,
  growth: 6,
  champion: 12,
  anchor: 12,
}

/** Single-market sponsorship (starter or legacy market) */
export function isSingleMarketTier(raw: string | null | undefined): boolean {
  return normalizeSponsorTierId(raw) === 'starter'
}

/** Category-wide sponsorship (growth or legacy category) */
export function isCategoryTier(raw: string | null | undefined): boolean {
  return normalizeSponsorTierId(raw) === 'growth'
}
