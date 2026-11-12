/**
 * Prefer a real descriptive title over SIDOF REF stubs like "Aviso REF:581143"
 * or empty authority-only labels.
 */

const REF_TITLE =
  /^(decreto|acuerdo|aviso|resoluci[oó]n|convocatoria|lineamientos?|nom)?\s*REF\s*:\s*\d+$/i

export function isWeakDofTitle(title: string | null | undefined): boolean {
  const t = (title ?? '').trim()
  if (!t) return true
  if (/^nota\s+\d+$/i.test(t)) return true
  if (REF_TITLE.test(t)) return true
  if (/^REF\s*:\s*\d+$/i.test(t)) return true
  // "<AUTHORITY> - REF:<code>" pattern sometimes stored after bad list joins
  if (/\s[-–—]\s*REF\s*:\s*\d+$/i.test(t) && t.length < 80) return true
  return false
}

export function resolveDisplayTitle(opts: {
  noteTitle?: string | null
  displayTitle?: string | null
  summary?: string | null
  authority?: string | null
  documentType?: string | null
  noteCode?: string | null
}): string {
  const stored = opts.displayTitle?.trim()
  if (stored && !isWeakDofTitle(stored)) return stored

  const note = opts.noteTitle?.trim()
  if (note && !isWeakDofTitle(note)) return note

  if (opts.summary?.trim()) {
    const sentence = opts.summary.trim().split(/(?<=\.)\s+/)[0] ?? opts.summary.trim()
    return sentence.slice(0, 180)
  }

  const type = opts.documentType?.trim()
  const auth = opts.authority?.trim()
  if (type && auth) return `${type} — ${auth}`.slice(0, 180)
  if (auth) return auth.slice(0, 180)
  if (type) return type
  return opts.noteCode ? `Nota del DOF ${opts.noteCode}` : 'Nota del Diario Oficial'
}
