/**
 * Lawyer-facing bulletin publication numbers (B6 polish).
 * Never surface internal tokens like QRO-DEMO / CDMX-DEMO-512.
 */

const FIXTURE_MAP: Record<string, string> = {
  'QRO-DEMO': 'Boletín 214',
  'JAL-DEMO': 'Boletín 187',
  'CDMX-DEMO-512': 'Boletín 512',
  'MEX-LISTA-DEMO': 'Boletín 901',
  'GRO-DEMO': 'Boletín 118',
}

/**
 * Returns a plausible publication label, or null when there is no number.
 * Callers should show the demo badge beside sample data.
 */
export function bulletinNumberDisplay(
  raw: string | null | undefined
): string | null {
  if (!raw || !raw.trim()) return null
  const trimmed = raw.trim()
  if (FIXTURE_MAP[trimmed]) return FIXTURE_MAP[trimmed]

  // Prefer a trailing run of digits (e.g. CDMX-DEMO-512 → 512).
  const trailing = trimmed.match(/(\d{2,})\s*$/)
  if (trailing) return `Boletín ${trailing[1]}`

  const stripped = trimmed
    .replace(/-?DEMO\b/gi, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!stripped || /\bdemo\b/i.test(stripped)) return 'Boletín del día'
  if (/^bolet[ií]n\b/i.test(stripped)) {
    return stripped.replace(/^bolet[ií]n\b/i, 'Boletín')
  }
  // Pure digits or short codes → Boletín N
  if (/^\d+$/.test(stripped)) return `Boletín ${stripped}`
  return `Boletín ${stripped}`
}
