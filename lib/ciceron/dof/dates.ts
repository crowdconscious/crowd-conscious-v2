/** America/Mexico_City wall clock helpers (no DST since 2022 → UTC−6 year-round). */

const CDMX_OFFSET_MS = 6 * 60 * 60 * 1000

export function isoToSidofDate(isoDate: string): string {
  // yyyy-mm-dd → dd-mm-yyyy
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) throw new Error(`invalid iso date: ${isoDate}`)
  return `${d}-${m}-${y}`
}

export function sidofDateToIso(sidof: string): string {
  // dd-mm-yyyy → yyyy-mm-dd
  const [d, m, y] = sidof.split('-')
  if (!y || !m || !d) throw new Error(`invalid sidof date: ${sidof}`)
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export function sidofDateToOfficialFecha(sidofOrIso: string): string {
  // dof.gob.mx uses dd/mm/yyyy
  if (/^\d{4}-\d{2}-\d{2}$/.test(sidofOrIso)) {
    const [y, m, d] = sidofOrIso.split('-')
    return `${d}/${m}/${y}`
  }
  const [d, m, y] = sidofOrIso.split('-')
  return `${d}/${m}/${y}`
}

/** Current calendar date in America/Mexico_City as yyyy-mm-dd. */
export function todayInMexicoCity(now = new Date()): string {
  const shifted = new Date(now.getTime() - CDMX_OFFSET_MS)
  return shifted.toISOString().slice(0, 10)
}

/** Calendar yyyy-mm-dd in America/Mexico_City for an instant (ISO or Date). */
export function dateInMexicoCity(instant: string | Date): string | null {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getTime() - CDMX_OFFSET_MS).toISOString().slice(0, 10)
}

function addCalendarDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y!, m! - 1, d! + days))
  return utc.toISOString().slice(0, 10)
}

/** True when the due instant falls on or after today's CDMX calendar date. */
export function isDueOnOrAfterTodayCdmx(
  dueAt: string,
  todayIso = todayInMexicoCity()
): boolean {
  const due = dateInMexicoCity(dueAt)
  return due !== null && due >= todayIso
}

/**
 * True when due is on/after today CDMX and on/before today+horizonDays (inclusive).
 * Used for «Plazos en los próximos 15 días».
 */
export function isDueWithinNextDaysCdmx(
  dueAt: string,
  horizonDays: number,
  todayIso = todayInMexicoCity()
): boolean {
  const due = dateInMexicoCity(dueAt)
  if (due === null || due < todayIso) return false
  const endIso = addCalendarDaysIso(todayIso, horizonDays)
  return due <= endIso
}

export function isWeekendIso(isoDate: string): boolean {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  const day = utc.getUTCDay()
  return day === 0 || day === 6
}

/** Last N calendar business days (Mon–Fri) ending at `endIso` inclusive. */
export function lastBusinessDays(endIso: string, count: number): string[] {
  const out: string[] = []
  const [y, m, d] = endIso.split('-').map(Number)
  const cursor = new Date(Date.UTC(y, m - 1, d))
  while (out.length < count) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) {
      out.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return out
}

export function officialDofUrl(codNota: string, isoOrSidofDate: string): string {
  const fecha = sidofDateToOfficialFecha(isoOrSidofDate)
  return `https://www.dof.gob.mx/nota_detalle.php?codigo=${encodeURIComponent(codNota)}&fecha=${encodeURIComponent(fecha)}`
}
