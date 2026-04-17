import type { PulseTierId } from '@/lib/pulse-tiers'
import { normalizePulseTierId } from '@/lib/pulse-tiers'

/** DB columns on sponsor_accounts for a Conscious Pulse product tier */
export type PulseTierBenefitsRow = {
  max_pulse_markets: number
  max_live_events: number
  has_custom_branding: boolean
  has_api_access: boolean
  has_white_label: boolean
}

const TIER_BENEFITS: Record<PulseTierId, PulseTierBenefitsRow> = {
  pilot: {
    max_pulse_markets: 1,
    max_live_events: 0,
    has_custom_branding: false,
    has_api_access: false,
    has_white_label: false,
  },
  pulse_unico: {
    max_pulse_markets: 1,
    max_live_events: 0,
    has_custom_branding: false,
    has_api_access: false,
    has_white_label: false,
  },
  pulse_pack: {
    max_pulse_markets: 3,
    max_live_events: 0,
    has_custom_branding: false,
    has_api_access: false,
    has_white_label: false,
  },
  suscripcion: {
    max_pulse_markets: 999,
    max_live_events: 5,
    has_custom_branding: true,
    has_api_access: true,
    has_white_label: false,
  },
  mundial_pack: {
    max_pulse_markets: 5,
    max_live_events: 0,
    has_custom_branding: true,
    has_api_access: false,
    has_white_label: false,
  },
  mundial_pack_founding: {
    max_pulse_markets: 5,
    max_live_events: 0,
    has_custom_branding: true,
    has_api_access: false,
    has_white_label: false,
  },
  enterprise: {
    max_pulse_markets: 999,
    max_live_events: 999,
    has_custom_branding: true,
    has_api_access: true,
    has_white_label: true,
  },
}

export function getPulseTierBenefits(tierRaw: string | null | undefined): PulseTierBenefitsRow {
  const id = normalizePulseTierId(tierRaw)
  return { ...TIER_BENEFITS[id] }
}
