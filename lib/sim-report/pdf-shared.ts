/**
 * Shared jsPDF drawing primitives for simulation reports.
 * Matches sponsor Pulse PDF brand colors (teal header).
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { jsPDF } from 'jspdf'
import sharp from 'sharp'
import { EM_DASH } from './format.ts'

export const PAGE_W = 210
export const PAGE_H = 297
export const MARGIN_X = 16
export const CONTENT_W = PAGE_W - MARGIN_X * 2

export const COLOR_TEAL: [number, number, number] = [16, 185, 129]
export const COLOR_TEXT: [number, number, number] = [30, 41, 59]
export const COLOR_MUTED: [number, number, number] = [100, 116, 139]
export const COLOR_AMBER: [number, number, number] = [180, 120, 24]
export const COLOR_BG_LIGHT: [number, number, number] = [245, 247, 250]
export const COLOR_BG_AMBER: [number, number, number] = [254, 243, 199]

export type PdfCtx = {
  doc: jsPDF
  y: number
}

export function newReportDoc(): jsPDF {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
}

export function ensureSpace(ctx: PdfCtx, needed: number): void {
  if (ctx.y + needed > PAGE_H - 18) {
    ctx.doc.addPage()
    ctx.y = 18
  }
}

export function drawSection(ctx: PdfCtx, title: string): void {
  ensureSpace(ctx, 14)
  ctx.doc.setFont('helvetica', 'bold')
  ctx.doc.setFontSize(10)
  ctx.doc.setTextColor(...COLOR_TEAL)
  ctx.doc.text(title.toUpperCase(), MARGIN_X, ctx.y)
  ctx.y += 6
  ctx.doc.setDrawColor(...COLOR_TEAL)
  ctx.doc.setLineWidth(0.3)
  ctx.doc.line(MARGIN_X, ctx.y, MARGIN_X + CONTENT_W, ctx.y)
  ctx.y += 5
}

export function drawParagraph(ctx: PdfCtx, text: string, size = 9.5): void {
  ctx.doc.setFont('helvetica', 'normal')
  ctx.doc.setFontSize(size)
  ctx.doc.setTextColor(...COLOR_TEXT)
  const lines = ctx.doc.splitTextToSize(text, CONTENT_W) as string[]
  const lineH = size * 0.42
  ensureSpace(ctx, lines.length * lineH + 2)
  ctx.doc.text(lines, MARGIN_X, ctx.y)
  ctx.y += lines.length * lineH + 3
}

export function drawMuted(ctx: PdfCtx, text: string, size = 8.5): void {
  ctx.doc.setFont('helvetica', 'normal')
  ctx.doc.setFontSize(size)
  ctx.doc.setTextColor(...COLOR_MUTED)
  const lines = ctx.doc.splitTextToSize(text, CONTENT_W) as string[]
  const lineH = size * 0.42
  ensureSpace(ctx, lines.length * lineH + 2)
  ctx.doc.text(lines, MARGIN_X, ctx.y)
  ctx.y += lines.length * lineH + 2
}

export function drawFooterAllPages(
  doc: jsPDF,
  siteHost: string,
  label: string,
): void {
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(`${siteHost} · ${label}`, MARGIN_X, PAGE_H - 7)
    doc.text(`${i} / ${n}`, PAGE_W - MARGIN_X, PAGE_H - 7, { align: 'right' })
  }
}

export function docToBuffer(doc: jsPDF): Buffer {
  const ab = doc.output('arraybuffer') as ArrayBuffer
  return Buffer.from(ab)
}

async function toJpegDataUrl(
  input: Buffer,
  width: number,
): Promise<string | null> {
  try {
    const jpeg = await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`
  } catch {
    return null
  }
}

let cachedLogo: string | null | undefined

/** Compressed JPEG data-URL of the Crowd Conscious mark, or null if missing. */
export async function loadBrandLogoDataUrl(): Promise<string | null> {
  if (cachedLogo !== undefined) return cachedLogo
  try {
    const buf = await readFile(
      path.join(process.cwd(), 'public/images/logo-small.png'),
    )
    cachedLogo = await toJpegDataUrl(buf, 220)
    return cachedLogo
  } catch {
    cachedLogo = null
    return null
  }
}

/** Fetch a QR JPEG for the Pulse URL (same public QR service used elsewhere). */
export async function fetchQrPngDataUrl(url: string): Promise<string | null> {
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(url)}`
    const res = await fetch(qrUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const ab = await res.arrayBuffer()
    return await toJpegDataUrl(Buffer.from(ab), 180)
  } catch {
    return null
  }
}

export function dash(v: string | null | undefined): string {
  if (v == null || v.trim() === '') return EM_DASH
  return v
}
