/**
 * Date status for client-alert drafts.
 * Dates already past at generation/open must be marked; never recommend acting before them.
 */

const ISO_DATE_RE = /\b(20\d{2})-(\d{2})-(\d{2})\b/g
const ES_DATE_RE =
  /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(20\d{2})\b/gi

const MONTHS_ES: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
}

export type AlertDateStatus = {
  raw: string
  iso: string | null
  passed: boolean
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function parseLooseDateToIso(raw: string): string | null {
  const t = raw.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const es = ES_DATE_RE.exec(t)
  ES_DATE_RE.lastIndex = 0
  if (es) {
    const day = pad2(Number(es[1]))
    const month = MONTHS_ES[es[2]!.toLowerCase()]
    const year = es[3]!
    if (month) return `${year}-${month}-${day}`
  }
  return null
}

export function classifyAlertDates(
  rawDates: string[],
  todayIso: string
): AlertDateStatus[] {
  return rawDates.map((raw) => {
    const iso = parseLooseDateToIso(raw) ?? (/^\d{4}-\d{2}-\d{2}/.test(raw.trim())
      ? raw.trim().slice(0, 10)
      : null)
    const passed = iso !== null && iso < todayIso
    return { raw, iso, passed }
  })
}

/** Spanish lines for the alert draft user prompt. */
export function formatAlertDatesForPrompt(statuses: AlertDateStatus[]): string {
  if (!statuses.length) return 'Fechas/obligaciones detectadas: (ninguna fecha ISO explícita).'
  return [
    'Fechas/obligaciones detectadas (respecto de la fecha de generación):',
    ...statuses.map((s) => {
      if (!s.iso) return `- ${s.raw} (sin fecha ISO; no invente una)`
      return s.passed
        ? `- ${s.raw} → ${s.iso} · FECHA VENCIDA (no recomiende actuar antes de ella)`
        : `- ${s.raw} → ${s.iso} · vigente / futura`
    }),
  ].join('\n')
}

/**
 * Annotate ISO and Spanish dates in draft body that are already past.
 * Idempotent if «fecha vencida» already appears next to the date.
 */
export function markPassedDatesInText(body: string, todayIso: string): string {
  let out = body

  out = out.replace(ISO_DATE_RE, (match, y, m, d, offset, full) => {
    const iso = `${y}-${m}-${d}`
    if (iso >= todayIso) return match
    const window = full.slice(offset, offset + match.length + 24)
    if (/fecha\s+vencida/i.test(window)) return match
    return `${match} (fecha vencida)`
  })

  out = out.replace(ES_DATE_RE, (match) => {
    const iso = parseLooseDateToIso(match)
    if (!iso || iso >= todayIso) return match
    if (/fecha\s+vencida/i.test(match)) return match
    return `${match} (fecha vencida)`
  })

  return out
}
