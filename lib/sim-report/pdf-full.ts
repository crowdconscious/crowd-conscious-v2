/**
 * FULL simulation report PDF (paying clients + admins).
 * Includes sample breakdown, full methodology, divergence caveat, map snapshot.
 */

import type { SimReportData, SimReportSegmentRow } from './types.ts'
import {
  divergenceUnavailableLabel,
  formatCount,
  formatDateEs,
  formatDateTimeEs,
  formatDivergenceScore,
  formatPctShare,
  isSmallRealSample,
} from './format.ts'
import {
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
  drawFooterAllPages,
  drawMuted,
  drawParagraph,
  drawSection,
  ensureSpace,
  fetchQrPngDataUrl,
  loadBrandLogoDataUrl,
  newReportDoc,
  type PdfCtx,
} from './pdf-shared.ts'
import sharp from 'sharp'

function drawHeader(ctx: PdfCtx, logo: string | null, generatedAt: string): void {
  const { doc } = ctx
  doc.setFillColor(...COLOR_TEAL)
  doc.rect(0, 0, PAGE_W, 30, 'F')
  if (logo) {
    try {
      doc.addImage(logo, 'JPEG', MARGIN_X, 7, 22, 14)
    } catch {
      // ignore
    }
  }
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text('Crowd Conscious', PAGE_W - MARGIN_X, 12, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Reporte completo de simulación · Pulse', PAGE_W - MARGIN_X, 18, {
    align: 'right',
  })
  doc.text(`Generado: ${formatDateTimeEs(generatedAt)}`, PAGE_W - MARGIN_X, 24, {
    align: 'right',
  })
}

function drawKeyValue(ctx: PdfCtx, label: string, value: string): void {
  ensureSpace(ctx, 6)
  ctx.doc.setFont('helvetica', 'bold')
  ctx.doc.setFontSize(9)
  ctx.doc.setTextColor(...COLOR_MUTED)
  ctx.doc.text(label, MARGIN_X, ctx.y)
  ctx.doc.setFont('helvetica', 'normal')
  ctx.doc.setTextColor(...COLOR_TEXT)
  const lines = ctx.doc.splitTextToSize(value, CONTENT_W - 55) as string[]
  ctx.doc.text(lines, MARGIN_X + 55, ctx.y)
  ctx.y += Math.max(5.5, lines.length * 4.2)
}

function drawShareBars(
  ctx: PdfCtx,
  title: string,
  rows: { label: string; share: number | null; count: number | null }[],
): void {
  drawSection(ctx, title)
  if (rows.length === 0) {
    drawMuted(ctx, '—')
    return
  }
  for (const row of rows) {
    ensureSpace(ctx, 10)
    ctx.doc.setFont('helvetica', 'normal')
    ctx.doc.setFontSize(9)
    ctx.doc.setTextColor(...COLOR_TEXT)
    ctx.doc.text(row.label, MARGIN_X, ctx.y)
    ctx.doc.setTextColor(...COLOR_MUTED)
    ctx.doc.text(
      `${formatPctShare(row.share)}  (${formatCount(row.count)})`,
      PAGE_W - MARGIN_X,
      ctx.y,
      { align: 'right' },
    )
    ctx.y += 3
    const barW = CONTENT_W
    ctx.doc.setFillColor(...COLOR_BG_LIGHT)
    ctx.doc.rect(MARGIN_X, ctx.y, barW, 3.5, 'F')
    if (row.share != null && Number.isFinite(row.share) && row.share > 0) {
      ctx.doc.setFillColor(...COLOR_TEAL)
      ctx.doc.rect(MARGIN_X, ctx.y, barW * Math.min(1, row.share), 3.5, 'F')
    }
    ctx.y += 7
  }
}

function drawSegmentTable(
  ctx: PdfCtx,
  title: string,
  segments: SimReportSegmentRow[],
  optionLabels: Record<string, string>,
): void {
  drawSection(ctx, title)
  if (segments.length === 0) {
    drawMuted(ctx, '—')
    return
  }
  for (const seg of segments.slice(0, 24)) {
    ensureSpace(ctx, 8)
    ctx.doc.setFont('helvetica', 'bold')
    ctx.doc.setFontSize(9)
    ctx.doc.setTextColor(...COLOR_TEXT)
    ctx.doc.text(`${seg.label}  (n=${seg.count})`, MARGIN_X, ctx.y)
    ctx.y += 4.5
    const parts: string[] = []
    for (const [optId, count] of Object.entries(seg.optionCounts)) {
      const label = optionLabels[optId] ?? optId
      const pct = seg.count > 0 ? Math.round((count / seg.count) * 100) : null
      parts.push(`${label}: ${pct == null ? '—' : `${pct}%`}`)
    }
    drawMuted(ctx, parts.length > 0 ? parts.join(' · ') : '—', 8)
  }
}

/** Build the full multi-page PDF buffer (map embedded when provided). */
export async function generateSimFullPdf(data: SimReportData): Promise<Buffer> {
  const doc = newReportDoc()
  const ctx: PdfCtx = { doc, y: 0 }
  const [logo, qr] = await Promise.all([
    loadBrandLogoDataUrl(),
    fetchQrPngDataUrl(data.pulseUrl),
  ])

  drawHeader(ctx, logo, data.generatedAt)
  ctx.y = 40

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...COLOR_TEXT)
  const titleLines = doc.splitTextToSize(data.question, CONTENT_W) as string[]
  doc.text(titleLines, MARGIN_X, ctx.y)
  ctx.y += titleLines.length * 6 + 6

  // Meta
  drawSection(ctx, 'Datos de la corrida')
  drawKeyValue(ctx, 'Modelo', dash(data.run.model))
  drawKeyValue(ctx, 'Versión de personas', dash(data.run.personaVersion))
  drawKeyValue(ctx, 'Agentes', formatCount(data.run.personaCount))
  drawKeyValue(ctx, 'Fecha de corrida', formatDateEs(data.run.completedAt))
  drawKeyValue(ctx, 'Revelada', formatDateEs(data.run.revealedAt))
  if (data.run.isFixture) {
    drawMuted(ctx, 'FIXTURE — datos de demostración, no una corrida real.')
  }

  // Divergence
  drawSection(ctx, 'Divergencia simulado vs real')
  doc.setFillColor(...COLOR_BG_AMBER)
  ensureSpace(ctx, 20)
  doc.roundedRect(MARGIN_X, ctx.y, CONTENT_W, 16, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR_TEXT)
  const scoreText =
    data.divergence.score != null && data.divergence.hasRealData
      ? formatDivergenceScore(data.divergence.score)
      : data.divergence.unavailableReason ?? divergenceUnavailableLabel()
  doc.text(`Índice: ${scoreText}`, MARGIN_X + 4, ctx.y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_MUTED)
  doc.text(
    `n real = ${formatCount(data.divergence.realVoteCount)} · outcome = ${dash(data.divergence.outcome)}`,
    MARGIN_X + 4,
    ctx.y + 12.5,
  )
  ctx.y += 20

  if (isSmallRealSample(data.divergence.realVoteCount)) {
    drawMuted(
      ctx,
      `Nota de confianza: la muestra real es pequeña (n=${data.divergence.realVoteCount} < 30). El índice de divergencia es orientativo; no interpretes diferencias finas como significativas.`,
    )
  }

  drawShareBars(
    ctx,
    'Resultado simulado',
    data.simulated.map((o) => ({
      label: o.label,
      share: o.share,
      count: o.count,
    })),
  )
  drawShareBars(
    ctx,
    'Resultado real',
    (data.real ?? []).map((o) => ({
      label: o.label,
      share: o.share,
      count: o.count,
    })),
  )
  if (data.real == null || !data.divergence.hasRealData) {
    drawMuted(
      ctx,
      data.divergence.unavailableReason ?? divergenceUnavailableLabel(),
    )
  }

  // Sample breakdown
  const optionLabels: Record<string, string> = {}
  for (const o of data.simulated) optionLabels[o.optionId] = o.label

  drawSegmentTable(ctx, 'Muestra por alcaldía', data.segments.byAlcaldia, optionLabels)
  drawSegmentTable(ctx, 'Muestra por edad', data.segments.byAgeBand, optionLabels)
  drawSegmentTable(ctx, 'Muestra por NSE', data.segments.byNse, optionLabels)

  drawSection(ctx, 'Metodología')
  for (const para of data.methodologyFull) {
    drawParagraph(ctx, para, 9)
  }

  // Map snapshot
  drawSection(ctx, 'Mapa de la muestra (AGEB)')
  if (data.mapPng && data.mapPng.length > 0) {
    ensureSpace(ctx, 110)
    try {
      const imgW = CONTENT_W
      const imgH = (imgW * 720) / 900
      const jpeg = await sharp(data.mapPng)
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer()
      doc.addImage(
        `data:image/jpeg;base64,${jpeg.toString('base64')}`,
        'JPEG',
        MARGIN_X,
        ctx.y,
        imgW,
        imgH,
      )
      ctx.y += imgH + 4
      drawMuted(
        ctx,
        'Puntos = personas sintéticas colocadas en AGEB (INEGI). Color = opción votada en la simulación.',
      )
    } catch {
      drawMuted(ctx, 'No se pudo incrustar el mapa.')
    }
  } else {
    drawMuted(
      ctx,
      'Mapa no disponible — faltan coordenadas AGEB mapeables para esta corrida.',
    )
  }

  drawSection(ctx, 'Ver el Pulse')
  drawMuted(ctx, dash(data.pulseUrl))
  if (qr) {
    try {
      ensureSpace(ctx, 32)
      doc.addImage(qr, 'JPEG', MARGIN_X, ctx.y, 28, 28)
      ctx.y += 30
    } catch {
      // ignore
    }
  }

  drawFooterAllPages(doc, data.branding.siteHost, 'Reporte completo de simulación')
  return docToBuffer(doc)
}
