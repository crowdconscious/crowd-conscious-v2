/**
 * Deterministic one-line daily summary for Hoy (same source as Su mañana metrics).
 */

export type HoyDailyLineInput = {
  /** Distinct matters/clients with novelty today (metric 1). */
  asuntosMoved: number
  /** Deadlines in the current CDMX week (metric 2). */
  plazosThisWeek: number
  /**
   * Weekday label in Spanish for the soonest plazo in that week
   * (e.g. «jueves»), or null when none.
   */
  nextPlazoWeekday: string | null
  /** Pending reviews (metric 3) — always reflected when > 0. */
  reviewsPending?: number
}

const WEEKDAY_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const

/** CDMX calendar weekday name for an ISO date or datetime (`YYYY-MM-DD…`). */
export function weekdayNameEsFromIso(iso: string): string {
  const day = iso.slice(0, 10)
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return 'día'
  // Noon UTC avoids DST edge cases for calendar-date labeling.
  const dt = new Date(Date.UTC(y, m - 1, d, 18, 0, 0))
  return WEEKDAY_ES[dt.getUTCDay()] ?? 'día'
}

/** Pick soonest dueAt within the supplied list (ISO strings). */
export function soonestDueIso(dueAts: Array<string | null | undefined>): string | null {
  let best: string | null = null
  for (const raw of dueAts) {
    if (!raw) continue
    if (!best || raw < best) best = raw
  }
  return best
}

/**
 * Plain-Spanish one-liner, e.g.
 * «Hoy: 2 asuntos se movieron, 1 plazo el jueves, todo lo demás sin novedades.»
 */
export function buildHoyDailyLine(input: HoyDailyLineInput): string {
  const moved = Math.max(0, Math.floor(input.asuntosMoved))
  const plazos = Math.max(0, Math.floor(input.plazosThisWeek))
  const reviews = Math.max(0, Math.floor(input.reviewsPending ?? 0))

  const parts: string[] = []

  if (moved === 0) {
    parts.push('ningún asunto se movió')
  } else if (moved === 1) {
    parts.push('1 asunto se movió')
  } else {
    parts.push(`${moved} asuntos se movieron`)
  }

  if (plazos === 0) {
    parts.push('sin plazos esta semana')
  } else if (plazos === 1) {
    const day = input.nextPlazoWeekday?.trim() || 'próximos días'
    parts.push(`1 plazo el ${day}`)
  } else {
    const day = input.nextPlazoWeekday?.trim()
    parts.push(
      day ? `${plazos} plazos (el primero el ${day})` : `${plazos} plazos esta semana`
    )
  }

  if (reviews > 0) {
    parts.push(
      reviews === 1
        ? '1 revisión pendiente'
        : `${reviews} revisiones pendientes`
    )
  } else if (moved > 0 || plazos > 0) {
    parts.push('todo lo demás sin novedades')
  }

  return `Hoy: ${parts.join(', ')}.`
}
