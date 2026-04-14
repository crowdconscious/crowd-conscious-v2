import type { LucideIcon } from 'lucide-react'
import { Wind, Droplets, Building2, Recycle, Handshake } from 'lucide-react'

export const CONSCIOUS_VALUE_KEYS = [
  'clean_air',
  'clean_water',
  'safe_cities',
  'zero_waste',
  'fair_trade',
] as const

export type ConsciousValueKey = (typeof CONSCIOUS_VALUE_KEYS)[number]

export const CONSCIOUS_VALUE_OPTIONS: Array<{
  key: ConsciousValueKey
  icon: LucideIcon
  label: { es: string; en: string }
}> = [
  { key: 'clean_air', icon: Wind, label: { es: 'Aire Limpio', en: 'Clean Air' } },
  { key: 'clean_water', icon: Droplets, label: { es: 'Agua Limpia', en: 'Clean Water' } },
  { key: 'safe_cities', icon: Building2, label: { es: 'Ciudades Seguras', en: 'Safe Cities' } },
  { key: 'zero_waste', icon: Recycle, label: { es: 'Cero Desperdicio', en: 'Zero Waste' } },
  { key: 'fair_trade', icon: Handshake, label: { es: 'Comercio Justo', en: 'Fair Trade' } },
]

const KEY_SET = new Set<string>(CONSCIOUS_VALUE_KEYS)

export function parseMetadataValues(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
  const raw = (metadata as { values?: unknown }).values
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is string => typeof v === 'string' && KEY_SET.has(v))
}
