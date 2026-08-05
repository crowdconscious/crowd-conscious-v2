/**
 * Señal Express oficio — PDF builder.
 *
 * Same jsPDF stack as `lib/sponsor-pulse-report-pdf.ts` (A4 portrait, mm units,
 * `doc.output('arraybuffer') → Buffer`). NO new packages, NO pdf-lib.
 *
 * The sender is ALWAYS the citizen (their typed name, or "Vecina/o de {colonia}"
 * when anonymous) — Crowd Conscious is never the complainant. The only footer is
 * "Generado con crowdconscious.app". The destinatario shows the generic title +
 * dependencia; the physical address / email line is OMITTED whenever it is still
 * the TODO_FILL_FROM_OFFICIAL_SOURCE placeholder (passed in as null) — we never
 * invent official contact data (§7.1 owner decision).
 */

import { jsPDF } from 'jspdf'

export interface OficioPdfInput {
  locale: 'es' | 'en'
  /** Pre-formatted date line, e.g. "Ciudad de México, a 4 de agosto de 2026". */
  fechaLinea: string
  destinatario: {
    titulo: string
    dependencia: string
    /** Null when still the TODO placeholder — the line is omitted. */
    direccion: string | null
  }
  asunto: string
  cuerpoParrafos: string[]
  peticion: string
  /** The citizen's signature name (already resolved to a non-empty string). */
  senderName: string
  /** Optional location line under the signature (colonia / street). */
  ubicacion?: string | null
}

const PAGE_W = 210
const PAGE_H = 297
const MARGIN_X = 20
const CONTENT_W = PAGE_W - MARGIN_X * 2

const COLOR_TEXT: [number, number, number] = [17, 24, 39]
const COLOR_MUTED: [number, number, number] = [107, 114, 128]

interface Ctx {
  doc: jsPDF
  y: number
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y + needed > PAGE_H - 22) {
    ctx.doc.addPage()
    ctx.y = 24
  }
}

function drawParagraph(
  ctx: Ctx,
  text: string,
  opts: { size?: number; bold?: boolean; gap?: number } = {}
): void {
  const { doc } = ctx
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
  doc.setFontSize(opts.size ?? 11)
  doc.setTextColor(...COLOR_TEXT)
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[]
  for (const line of lines) {
    ensureSpace(ctx, 6)
    doc.text(line, MARGIN_X, ctx.y)
    ctx.y += 6
  }
  ctx.y += opts.gap ?? 3
}

/** Build the oficio PDF and return a Node Buffer for Supabase Storage. */
export function generateOficioPDF(input: OficioPdfInput): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ctx: Ctx = { doc, y: 26 }
  const es = input.locale === 'es'

  // Date, right-aligned.
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR_TEXT)
  doc.text(input.fechaLinea, PAGE_W - MARGIN_X, ctx.y, { align: 'right' })
  ctx.y += 14

  // Destinatario block.
  drawParagraph(ctx, input.destinatario.titulo, { bold: true, gap: 0 })
  drawParagraph(ctx, input.destinatario.dependencia, { gap: 0 })
  if (input.destinatario.direccion) {
    drawParagraph(ctx, input.destinatario.direccion, { gap: 0 })
  }
  drawParagraph(ctx, es ? 'P R E S E N T E' : 'PRESENTE', { gap: 6 })

  // Asunto.
  drawParagraph(ctx, `${es ? 'Asunto' : 'Subject'}: ${input.asunto}`, {
    bold: true,
    gap: 6,
  })

  // Body paragraphs.
  for (const p of input.cuerpoParrafos) {
    if (p && p.trim().length > 0) drawParagraph(ctx, p.trim(), { gap: 4 })
  }

  // Petición.
  if (input.peticion && input.peticion.trim().length > 0) {
    drawParagraph(ctx, input.peticion.trim(), { gap: 8 })
  }

  // Cierre + firma (the citizen).
  drawParagraph(ctx, es ? 'Atentamente,' : 'Sincerely,', { gap: 10 })
  drawParagraph(ctx, input.senderName, { bold: true, gap: 0 })
  if (input.ubicacion) {
    drawParagraph(ctx, input.ubicacion, { size: 10, gap: 0 })
  }

  // Footer on every page — the ONLY footer line.
  const footer = 'Generado con crowdconscious.app'
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(210, 214, 220)
    doc.setLineWidth(0.3)
    doc.line(MARGIN_X, PAGE_H - 16, PAGE_W - MARGIN_X, PAGE_H - 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(footer, MARGIN_X, PAGE_H - 10)
  }

  const ab = doc.output('arraybuffer') as ArrayBuffer
  return Buffer.from(ab)
}

/** Spanish/English formatted date line for the oficio header. */
export function formatOficioDate(locale: 'es' | 'en', date: Date = new Date()): string {
  if (locale === 'es') {
    const formatted = date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return `Ciudad de México, a ${formatted}`
  }
  const formatted = date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `Mexico City, ${formatted}`
}
