/**
 * FREE one-page simulation summary PDF.
 * Spanish copy. Never fabricates divergence (shows "—" / unavailable label).
 */

import type { SimReportData } from './types.ts'
import {
  divergenceUnavailableLabel,
  formatCount,
  formatDateTimeEs,
  formatDivergenceScore,
  formatPctShare,
} from './format.ts'
import {
  COLOR_AMBER,
  COLOR_BG_AMBER,
  COLOR_BG_LIGHT,
  COLOR_MUTED,
  COLOR_TEAL,
  COLOR_TEXT,
  CONTENT_W,
  MARGIN_X,
  PAGE_W,
  dash,
  docToBuffer,
  drawMuted,
  drawParagraph,
  drawSection,
  fetchQrPngDataUrl,
  loadBrandLogoDataUrl,
  newReportDoc,
  type PdfCtx,
  drawFooterAllPages,
} from './pdf-shared.ts'

function drawHeader(ctx: PdfCtx, logo: string | null, generatedAt: string): void {
  const { doc } = ctx
  const HEADER_H = 34
  const LOGO_H_MM = 26
  const LOGO_W_MM = (229 / 233) * LOGO_H_MM
  doc.setFillColor(...COLOR_TEAL)
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F')
  if (logo) {
    try {
      const pad = 1.5
      const boxX = MARGIN_X
      const boxY = (HEADER_H - LOGO_H_MM) / 2 - pad
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(
        boxX,
        boxY,
        LOGO_W_MM + pad * 2,
        LOGO_H_MM + pad * 2,
        1.5,
        1.5,
        'F',
      )
      doc.addImage(logo, 'PNG', boxX + pad, boxY + pad, LOGO_W_MM, LOGO_H_MM)
    } catch {
      // text-only fallback
    }
  }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text('Crowd Conscious', PAGE_W - MARGIN_X, 12, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Resumen de simulación · Pulse', PAGE_W - MARGIN_X, 18, {
    align: 'right',
  })
  doc.text(`Generado: ${formatDateTimeEs(generatedAt)}`, PAGE_W - MARGIN_X, 24, {
    align: 'right',
  })
}

function drawDistTable(
  ctx: PdfCtx,
  title: string,
  rows: { label: string; share: string; count: string }[],
): void {
  drawSection(ctx, title)
  if (rows.length === 0) {
    drawMuted(ctx, '—')
    return
  }
  ctx.doc.setFillColor(...COLOR_BG_LIGHT)
  ctx.doc.rect(MARGIN_X, ctx.y - 3, CONTENT_W, 7, 'F')
  ctx.doc.setFont('helvetica', 'bold')
  ctx.doc.setFontSize(8)
  ctx.doc.setTextColor(...COLOR_MUTED)
  ctx.doc.text('Opción', MARGIN_X + 2, ctx.y + 1.5)
  ctx.doc.text('%', MARGIN_X + CONTENT_W * 0.62, ctx.y + 1.5)
  ctx.doc.text('n', MARGIN_X + CONTENT_W * 0.82, ctx.y + 1.5)
  ctx.y += 7
  for (const row of rows) {
    ctx.doc.setFont('helvetica', 'normal')
    ctx.doc.setFontSize(9)
    ctx.doc.setTextColor(...COLOR_TEXT)
    const labelLines = ctx.doc.splitTextToSize(row.label, CONTENT_W * 0.55) as string[]
    ctx.doc.text(labelLines, MARGIN_X + 2, ctx.y)
    ctx.doc.text(row.share, MARGIN_X + CONTENT_W * 0.62, ctx.y)
    ctx.doc.text(row.count, MARGIN_X + CONTENT_W * 0.82, ctx.y)
    ctx.y += Math.max(6, labelLines.length * 4.2)
  }
  ctx.y += 2
}

/** Build the free one-page (or short) summary PDF buffer. */
export async function generateSimSummaryPdf(
  data: SimReportData,
): Promise<Buffer> {
  const doc = newReportDoc()
  const ctx: PdfCtx = { doc, y: 0 }
  const [logo, qr] = await Promise.all([
    loadBrandLogoDataUrl(),
    fetchQrPngDataUrl(data.pulseUrl),
  ])

  drawHeader(ctx, logo, data.generatedAt)
  ctx.y = 44

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...COLOR_TEXT)
  const titleLines = doc.splitTextToSize(data.question, CONTENT_W) as string[]
  doc.text(titleLines, MARGIN_X, ctx.y)
  ctx.y += titleLines.length * 6 + 4

  // Divergence callout
  const scoreLabel =
    data.divergence.score != null && data.divergence.hasRealData
      ? formatDivergenceScore(data.divergence.score)
      : null
  doc.setFillColor(...COLOR_BG_AMBER)
  doc.roundedRect(MARGIN_X, ctx.y, CONTENT_W, 18, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_AMBER)
  doc.text('ÍNDICE DE DIVERGENCIA', MARGIN_X + 4, ctx.y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...COLOR_TEXT)
  if (scoreLabel != null) {
    doc.text(scoreLabel, MARGIN_X + 4, ctx.y + 14)
  } else {
    doc.setFontSize(10)
    doc.text(
      data.divergence.unavailableReason ?? divergenceUnavailableLabel(),
      MARGIN_X + 4,
      ctx.y + 14,
    )
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_MUTED)
  doc.text(
    `Votos reales: ${formatCount(data.divergence.realVoteCount)}   ·   Agentes simulados: ${formatCount(data.run.personaCount)}`,
    MARGIN_X + CONTENT_W * 0.42,
    ctx.y + 11,
  )
  ctx.y += 24

  drawDistTable(
    ctx,
    'Resultado simulado',
    data.simulated.map((o) => ({
      label: o.label,
      share: formatPctShare(o.share),
      count: formatCount(o.count),
    })),
  )

  drawDistTable(
    ctx,
    'Resultado real (personas)',
    data.real == null
      ? []
      : data.real.map((o) => ({
          label: o.label,
          share: formatPctShare(o.share),
          count: formatCount(o.count),
        })),
  )
  if (data.real == null || !data.divergence.hasRealData) {
    drawMuted(
      ctx,
      data.divergence.unavailableReason ?? divergenceUnavailableLabel(),
    )
  }

  drawSection(ctx, 'Metodología (resumen)')
  drawParagraph(ctx, data.methodologyShort, 9)

  // QR + link
  drawSection(ctx, 'Ver el Pulse')
  drawMuted(ctx, dash(data.pulseUrl))
  if (qr) {
    try {
      doc.addImage(qr, 'JPEG', MARGIN_X, ctx.y, 28, 28)
      ctx.y += 30
    } catch {
      // ignore
    }
  }

  drawFooterAllPages(doc, data.branding.siteHost, 'Resumen de simulación')
  return docToBuffer(doc)
}
