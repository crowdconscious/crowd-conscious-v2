import { STRIPE_FEE_RATE } from '@/lib/sponsor-tiers'

/** Conscious Pulse B2B product tiers (replaces legacy market sponsorship tiers on /pulse). */
export const PULSE_TIERS = {
  pilot: {
    id: 'pilot' as const,
    name: 'Pilot Pulse',
    nameEn: 'Pilot Pulse',
    priceMXN: 1500,
    fundPercent: 0,
    platformPercent: 1,
    durationLabelEs: '7 días activos',
    durationLabelEn: '7 days live',
    popular: false,
    contactOnly: false,
    featuresEs: [
      '1 pregunta · 7 días',
      'Resultados en vivo + link compartible',
      'Tier de prueba — sin asignación al Fondo',
    ],
    featuresEn: [
      '1 question · 7 days',
      'Live results + shareable link',
      'Trial tier — no Fund allocation',
    ],
    bestForEs: 'Probar Pulse antes de comprometerte con un plan completo',
    bestForEn: 'Try Pulse before committing to a full plan',
    sponsorshipMonths: 1,
  },
  pulse_unico: {
    id: 'pulse_unico' as const,
    name: 'Pulse Único',
    nameEn: 'Pulse Single',
    priceMXN: 5000,
    fundPercent: 0.2,
    platformPercent: 0.8,
    durationLabelEs: '7–30 días de votación',
    durationLabelEn: '7–30 days of voting',
    popular: false,
    contactOnly: false,
    featuresEs: [
      '1 pregunta',
      'Resultados en vivo + código QR',
      'PDF con insights de confianza',
      '20% → Fondo Consciente',
    ],
    featuresEn: [
      '1 question',
      'Live results + QR for distribution',
      'PDF report with confidence insights',
      '20% → Conscious Fund',
    ],
    bestForEs: 'Primeros clientes, negocios locales',
    bestForEn: 'First-time clients, local businesses',
    /** Internal record-keeping for sponsorship window */
    sponsorshipMonths: 1,
  },
  pulse_pack: {
    id: 'pulse_pack' as const,
    name: 'Pulse Pack (3)',
    nameEn: 'Pulse Pack (3)',
    priceMXN: 12000,
    fundPercent: 0.25,
    platformPercent: 0.75,
    durationLabelEs: '60 días de votación · hasta 3 Pulses en paralelo',
    durationLabelEn: '60 days of voting · up to 3 Pulses in parallel',
    popular: true,
    contactOnly: false,
    featuresEs: [
      '3 preguntas',
      'Vista comparativa entre preguntas',
      'Destacado en la plataforma',
      '25% → Fondo Consciente',
    ],
    featuresEn: [
      '3 questions',
      'Comparative view across questions',
      'Featured on the platform',
      '25% → Conscious Fund',
    ],
    bestForEs: 'Investigación multi-tema, marcas',
    bestForEn: 'Multi-topic research, brands',
    sponsorshipMonths: 2,
  },
  suscripcion: {
    id: 'suscripcion' as const,
    name: 'Suscripción',
    nameEn: 'Subscription',
    priceMXN: 25000,
    fundPercent: 0.4,
    platformPercent: 0.6,
    durationLabelEs: 'Mensual',
    durationLabelEn: 'Monthly',
    popular: false,
    contactOnly: false,
    featuresEs: [
      'Hasta 5 preguntas por mes',
      'Marca personalizada en tus Pulses',
      'API + soporte dedicado',
      'Reporte ejecutivo mensual',
      '40% → Fondo Consciente',
    ],
    featuresEn: [
      'Up to 5 questions per month',
      'Custom branding on all Pulses',
      'API access + dedicated support',
      'Monthly executive report',
      '40% → Conscious Fund',
    ],
    bestForEs: 'Municipios, medios, marcas con agenda recurrente',
    bestForEn: 'Municipalities, media, brands with a recurring agenda',
    sponsorshipMonths: 12,
  },
  mundial_pack: {
    id: 'mundial_pack' as const,
    name: 'Mundial Pulse Pack',
    nameEn: 'World Cup Pulse Pack',
    priceMXN: 50000,
    fundPercent: 0.4,
    platformPercent: 0.6,
    durationLabelEs: 'Mundial 2026 (5 fases)',
    durationLabelEn: 'World Cup 2026 (5 phases)',
    popular: false,
    contactOnly: false,
    featuresEs: [
      '5 Pulses durante el torneo (fase de grupos / R16 / cuartos / semis / final)',
      'Destacado en plataforma durante cada fase',
      'Tarjeta de patrocinador en cada Pulse',
      'Mención en newsletter y CEO digest',
      '40% → Fondo Consciente',
    ],
    featuresEn: [
      '5 Pulses across the tournament (group / R16 / QF / SF / final)',
      'Featured placement during each phase',
      'Branded sponsor card on each Pulse',
      'Mentioned in newsletter and CEO digest',
      '40% → Conscious Fund',
    ],
    bestForEs: 'Marcas que quieren presencia sostenida en el Mundial',
    bestForEn: 'Brands seeking sustained World Cup presence',
    sponsorshipMonths: 3,
  },
  mundial_pack_founding: {
    id: 'mundial_pack_founding' as const,
    name: 'Mundial Pulse Pack — Founding',
    nameEn: 'World Cup Pulse Pack — Founding',
    priceMXN: 25000,
    fundPercent: 0.4,
    platformPercent: 0.6,
    durationLabelEs: 'Mundial 2026 + reconocimiento permanente',
    durationLabelEn: 'World Cup 2026 + permanent recognition',
    popular: false,
    contactOnly: false,
    featuresEs: [
      'Todo lo del Mundial Pulse Pack (5 Pulses)',
      'Logo permanente en homepage "Marcas Conscientes"',
      'Reconocimiento de por vida en /about',
      'Solo 5 espacios — 50% de descuento',
      '40% → Fondo Consciente',
    ],
    featuresEn: [
      'Everything in Mundial Pulse Pack (5 Pulses)',
      'Permanent logo on homepage "Trusted Brands" row',
      'Lifetime recognition on /about',
      'Only 5 spots — 50% off',
      '40% → Conscious Fund',
    ],
    bestForEs: 'Las primeras 5 marcas que apuestan por el Mundial',
    bestForEn: 'The first 5 brands betting on the World Cup',
    sponsorshipMonths: 3,
  },
  enterprise: {
    id: 'enterprise' as const,
    name: 'Enterprise',
    nameEn: 'Enterprise',
    priceMXN: 0,
    fundPercent: 0.4,
    platformPercent: 0.6,
    // No duration subtitle — the "A medida" price label already conveys it.
    durationLabelEs: '',
    durationLabelEn: '',
    popular: false,
    contactOnly: true,
    featuresEs: [
      'Solución white-label',
      'SSO, API e integraciones a medida',
      'Preguntas ilimitadas',
      'Soporte para Conscious Live',
      '40% → Fondo Consciente',
    ],
    featuresEn: [
      'White-label solution',
      'SSO, API, and custom integrations',
      'Unlimited questions',
      'Live event support (Conscious Live)',
      '40% → Conscious Fund',
    ],
    bestForEs: 'Gobierno estatal/federal, grandes corporativos, medios nacionales',
    bestForEn: 'State/federal government, large corporates, national media',
    sponsorshipMonths: 12,
  },
} as const

export type PulseTierId = keyof typeof PULSE_TIERS

export function normalizePulseTierId(raw: string | null | undefined): PulseTierId {
  const k = (raw || '').toLowerCase()
  if (k in PULSE_TIERS) return k as PulseTierId
  return 'pulse_unico'
}

export function calculatePulseFundAllocationRounded(amountGrossMXN: number, tierId: PulseTierId) {
  const tier = PULSE_TIERS[tierId]
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
    fundAmountRounded: Math.round(fundAmount),
    platformAmountRounded: Math.round(platformAmount),
    netAmountRounded: Math.round(netAmount),
    stripeFeeRounded: Math.round(stripeFee),
  }
}
