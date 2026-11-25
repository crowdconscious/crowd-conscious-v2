/**
 * Pure formatters for the morning WhatsApp {{5}} line when today's
 * bulletin hits are available. No I/O. Keep results ≤90 characters
 * (WhatsApp template param limit used by pickTopHeadlineWhatsAppParam).
 */

export const WHATSAPP_HEADLINE_MAX = 90

const ONES: Record<string, number> = {
  primero: 1,
  primer: 1,
  segundo: 2,
  tercero: 3,
  tercer: 3,
  cuarto: 4,
  quinto: 5,
  sexto: 6,
  septimo: 7,
  octavo: 8,
  noveno: 9,
}

const TENS: Record<string, number> = {
  decimo: 10,
  vigesimo: 20,
  trigesimo: 30,
  cuadragesimo: 40,
  quincuagesimo: 50,
  sexagesimo: 60,
}

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function parseOrdinalPhrase(phrase: string): number | null {
  const parts = phrase.split(' ').filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1) {
    return TENS[parts[0]!] ?? ONES[parts[0]!] ?? null
  }
  const tens = TENS[parts[0]!]
  const ones = ONES[parts[1]!]
  if (tens != null && ones != null && ones < 10) return tens + ones
  return null
}

/** «Juzgado Trigésimo Segundo de lo Civil» → «Juzgado 32 Civil». */
export function shortCourtLabel(
  courtName: string | null | undefined
): string | null {
  if (!courtName?.trim()) return null
  const f = fold(courtName)
  const m = f.match(
    /juzgado\s+(.+?)\s+de\s+lo\s+civil(?:\s+de\s+proceso\s+oral)?/
  )
  if (!m) return null
  const n = parseOrdinalPhrase(m[1]!)
  if (n == null) return null
  const oral = /proceso\s+oral/.test(f) ? ' Oral' : ''
  return `Juzgado ${n} Civil${oral}`
}

export function officialBulletinNo(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const m = raw.trim().match(/(\d{1,4})\s*$/)
  return m?.[1] ?? null
}

export type TodayBulletinHeadlineInput = {
  stateCode: string
  bulletinNumber: string | null
  count: number
  courtName?: string | null
  expediente?: string | null
}

/**
 * Example: «Boletín Judicial CDMX No. 200: 8 coincidencias (Juzgado 32 Civil, 51/2026 y más)»
 */
export function formatTodayBulletinWhatsAppHeadline(
  input: TodayBulletinHeadlineInput
): string | null {
  if (input.count <= 0) return null
  const state = (input.stateCode || 'CDMX').trim().toUpperCase()
  const no = officialBulletinNo(input.bulletinNumber)
  const head = no
    ? `Boletín Judicial ${state} No. ${no}`
    : `Boletín Judicial ${state}`
  const noun = input.count === 1 ? 'coincidencia' : 'coincidencias'
  const base = `${head}: ${input.count} ${noun}`
  const court = shortCourtLabel(input.courtName ?? null)
  const exp = input.expediente?.trim() || null
  const more = input.count > 1 ? ' y más' : ''

  const candidates = [
    court && exp ? `${base} (${court}, ${exp}${more})` : null,
    exp ? `${base} (${exp}${more})` : null,
    court ? `${base} (${court}${more})` : null,
    base,
  ].filter((s): s is string => Boolean(s))

  for (const c of candidates) {
    const oneLine = c.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (oneLine.length > 0 && oneLine.length <= WHATSAPP_HEADLINE_MAX) {
      return oneLine
    }
  }
  return base.slice(0, WHATSAPP_HEADLINE_MAX).trimEnd()
}

export type TodayBulletinHit = {
  sourceId: string
  bulletinNumber: string | null
  courtName: string | null
  expediente: string | null
}

/** Prefer a short expediente so the 90-char line can include court + file. */
export function pickSampleBulletinHit(
  hits: TodayBulletinHit[]
): TodayBulletinHit | null {
  if (!hits.length) return null
  const ranked = [...hits].sort((a, b) => {
    const la = (a.expediente ?? '').length
    const lb = (b.expediente ?? '').length
    if (la !== lb) return la - lb
    return (a.expediente ?? '').localeCompare(b.expediente ?? '')
  })
  return ranked[0] ?? null
}
