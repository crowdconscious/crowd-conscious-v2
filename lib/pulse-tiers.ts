import { STRIPE_FEE_RATE } from '@/lib/sponsor-tiers'

/** Conscious Pulse B2B product tiers (replaces legacy market sponsorship tiers on /pulse). */
export const PULSE_TIERS = {
  pulse_unico: {
    id: 'pulse_unico' as const,
    name: 'Pulse Único',
    nameEn: 'Pulse Single',
    priceMXN: 5000,
    fundPercent: 0.2,
    platformPercent: 0.8,
    durationLabelEs: '7–30 días activos',
    durationLabelEn: '7–30 days live',
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
    durationLabelEs: '60 días',
    durationLabelEn: '60 days',
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
    priceMXN: 20000,
    fundPercent: 0.3,
    platformPercent: 0.7,
    durationLabelEs: 'Mensual (primer mes)',
    durationLabelEn: 'Monthly (first month)',
    popular: false,
    contactOnly: false,
    featuresEs: [
      'Preguntas ilimitadas',
      'Marca personalizada en tus Pulses',
      'API + soporte dedicado',
      '30% → Fondo Consciente',
    ],
    featuresEn: [
      'Unlimited questions',
      'Custom branding on all Pulses',
      'API access + dedicated support',
      '30% → Conscious Fund',
    ],
    bestForEs: 'Municipios, medios',
    bestForEn: 'Municipalities, media',
    sponsorshipMonths: 12,
  },
  enterprise: {
    id: 'enterprise' as const,
    name: 'Enterprise',
    nameEn: 'Enterprise',
    priceMXN: 0,
    fundPercent: 0.4,
    platformPercent: 0.6,
    durationLabelEs: 'A la medida',
    durationLabelEn: 'Custom',
    popular: false,
    contactOnly: true,
    featuresEs: [
      'Solución white-label',
      'Integraciones a medida',
      'Soporte para Conscious Live',
      '40% → Fondo Consciente',
    ],
    featuresEn: [
      'White-label solution',
      'Custom integrations',
      'Live event support (Conscious Live)',
      '40% → Conscious Fund',
    ],
    bestForEs: 'Gobierno, grandes corporativos',
    bestForEn: 'Government, large enterprises',
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
