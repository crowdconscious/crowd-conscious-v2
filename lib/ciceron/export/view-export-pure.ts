/**
 * Pure helpers for one-click view exports (CSV text + row shaping).
 * PDF/Excel use these rows client-side via jspdf / exceljs — no new services.
 */

export type ExportColumn = { key: string; header: string }

export type ExportRow = Record<string, string | number | null | undefined>

/** Escape one CSV cell (RFC-style quotes). */
export function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Build a CSV document from columns + rows. */
export function buildCsv(columns: ExportColumn[], rows: ExportRow[]): string {
  const header = columns.map((c) => csvEscape(c.header)).join(',')
  const body = rows.map((row) =>
    columns.map((c) => csvEscape(row[c.key])).join(',')
  )
  return [header, ...body].join('\n')
}

/** Flatten rows to a string matrix for PDF/Excel. */
export function buildMatrix(
  columns: ExportColumn[],
  rows: ExportRow[]
): { headers: string[]; body: string[][] } {
  return {
    headers: columns.map((c) => c.header),
    body: rows.map((row) =>
      columns.map((c) => {
        const v = row[c.key]
        return v == null ? '' : String(v)
      })
    ),
  }
}

export function suggestFilename(base: string, ext: string): string {
  const safe = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `${safe || 'ciceron-export'}.${ext}`
}
