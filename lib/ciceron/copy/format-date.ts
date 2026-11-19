/**
 * B1/B2 — Spanish (es-MX) date/time display for lawyer-facing UI.
 * Long: «14 de noviembre de 2026»; short: «14 nov 2026»; times 24 h.
 */

const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

const CDMX = 'America/Mexico_City'

function partsInCdmx(instant: Date): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
} | null {
  if (Number.isNaN(instant.getTime())) return null
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: CDMX,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const bag: Record<string, string> = {}
  for (const p of fmt.formatToParts(instant)) {
    if (p.type !== 'literal') bag[p.type] = p.value
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
  }
}

/** Parse ISO date (yyyy-mm-dd) or datetime; calendar dates stay on that day. */
function toDate(isoOrDate: string | Date): Date | null {
  if (isoOrDate instanceof Date) {
    return Number.isNaN(isoOrDate.getTime()) ? null : isoOrDate
  }
  const s = isoOrDate.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(Date.UTC(y!, m! - 1, d!, 18, 0, 0)) // noon-ish CDMX-safe
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** «14 de noviembre de 2026» */
export function formatDateLongEs(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '—'
  const d = toDate(isoOrDate)
  if (!d) return String(isoOrDate)
  const p = partsInCdmx(d)
  if (!p) return String(isoOrDate)
  return `${p.day} de ${MONTHS_LONG[p.month - 1]} de ${p.year}`
}

/** «14 nov 2026» */
export function formatDateShortEs(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '—'
  const d = toDate(isoOrDate)
  if (!d) return String(isoOrDate)
  const p = partsInCdmx(d)
  if (!p) return String(isoOrDate)
  return `${p.day} ${MONTHS_SHORT[p.month - 1]} ${p.year}`
}

/** «14 de noviembre de 2026, 09:30» (24 h) */
export function formatDateTimeEs(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '—'
  const d = toDate(isoOrDate)
  if (!d) return String(isoOrDate)
  const p = partsInCdmx(d)
  if (!p) return String(isoOrDate)
  const hh = String(p.hour).padStart(2, '0')
  const mm = String(p.minute).padStart(2, '0')
  return `${p.day} de ${MONTHS_LONG[p.month - 1]} de ${p.year}, ${hh}:${mm}`
}

/**
 * Inclusive range in Spanish: «16 al 22 de noviembre de 2026»
 * or «28 de noviembre al 4 de diciembre de 2026» when months differ.
 */
export function formatDateRangeEs(
  startIso: string | Date | null | undefined,
  endIso: string | Date | null | undefined
): string {
  if (!startIso || !endIso) return '—'
  const a = toDate(startIso)
  const b = toDate(endIso)
  if (!a || !b) return '—'
  const pa = partsInCdmx(a)
  const pb = partsInCdmx(b)
  if (!pa || !pb) return '—'
  if (pa.year === pb.year && pa.month === pb.month) {
    return `${pa.day} al ${pb.day} de ${MONTHS_LONG[pa.month - 1]} de ${pa.year}`
  }
  if (pa.year === pb.year) {
    return `${pa.day} de ${MONTHS_LONG[pa.month - 1]} al ${pb.day} de ${MONTHS_LONG[pb.month - 1]} de ${pa.year}`
  }
  return `${pa.day} de ${MONTHS_LONG[pa.month - 1]} de ${pa.year} al ${pb.day} de ${MONTHS_LONG[pb.month - 1]} de ${pb.year}`
}

/** Filter display / placeholder: dd/mm/aaaa */
export function formatDateFilterEs(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return ''
  const d = toDate(isoOrDate)
  if (!d) return ''
  const p = partsInCdmx(d)
  if (!p) return ''
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`
}

/** Parse dd/mm/aaaa → yyyy-mm-dd for filter comparisons. */
export function parseDateFilterEs(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = Number(m[1])
  const mo = Number(m[2])
  const y = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export const DATE_FILTER_PLACEHOLDER = 'dd/mm/aaaa'
