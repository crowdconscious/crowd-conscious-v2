/** Option lists for the contratar form (stored as codes; labels per locale). */
export const ORG_TYPES = [
  { code: 'aseguradora_salud', es: 'Aseguradora o salud', en: 'Insurer or health' },
  { code: 'banco_fintech', es: 'Banco o fintech', en: 'Bank or fintech' },
  { code: 'escuela', es: 'Escuela', en: 'School' },
  { code: 'universidad', es: 'Universidad', en: 'University' },
  { code: 'condominio', es: 'Condominio', en: 'Condominium' },
  { code: 'otra', es: 'Otra', en: 'Other' },
] as const

export const BASE_SIZES = [
  { code: 'lt_500', es: 'Menos de 500', en: 'Under 500' },
  { code: '500_2k', es: '500 a 2,000', en: '500 to 2,000' },
  { code: '2k_10k', es: '2,000 a 10,000', en: '2,000 to 10,000' },
  { code: '10k_50k', es: '10,000 a 50,000', en: '10,000 to 50,000' },
  { code: 'gt_50k', es: 'Más de 50,000', en: 'Over 50,000' },
] as const

export const VISIBILITY_PREFS = [
  { code: 'privada', es: 'Privada', en: 'Private' },
  { code: 'publica', es: 'Pública', en: 'Public' },
  { code: 'en_llamada', es: 'Lo decidimos en la llamada', en: 'We decide on the call' },
] as const

export const ORG_TYPE_CODES = ORG_TYPES.map((o) => o.code) as [string, ...string[]]
export const BASE_SIZE_CODES = BASE_SIZES.map((o) => o.code) as [string, ...string[]]
export const VISIBILITY_PREF_CODES = VISIBILITY_PREFS.map((o) => o.code) as [string, ...string[]]

export function labelOf(list: readonly { code: string; es: string }[], code: string | null | undefined) {
  return list.find((o) => o.code === code)?.es ?? code ?? ''
}
