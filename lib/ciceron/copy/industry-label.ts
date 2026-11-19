/**
 * Map seed `external_ref` industry slugs to Spanish partner-facing labels.
 */

const INDUSTRY_ES: Record<string, string> = {
  fintech: 'Fintech',
  comercio_exterior: 'Comercio exterior',
  energia: 'Energía renovable',
  energia_renovable: 'Energía renovable',
  farmaceutica: 'Distribución farmacéutica',
  farmaceutico: 'Distribución farmacéutica',
  inmuebles: 'Fondo inmobiliario',
  inmobiliario: 'Fondo inmobiliario',
  alimentos: 'Alimentos',
  pagos: 'Fintech de pagos',
}

/** «fintech» → «Fintech»; already-Spanish labels pass through. */
export function formatClientIndustryEs(raw: string | null | undefined): string {
  const s = (raw ?? '').trim()
  if (!s) return '—'
  const key = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_')
  if (INDUSTRY_ES[key]) return INDUSTRY_ES[key]!
  // Humanize unknown snake_case: comercio_exterior → Comercio exterior
  if (s.includes('_')) {
    const words = s.split('_').filter(Boolean)
    return words
      .map((w, i) =>
        i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()
      )
      .join(' ')
  }
  // Single slug word: salud → Salud
  if (/^[a-z0-9]+$/i.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  }
  return s
}
