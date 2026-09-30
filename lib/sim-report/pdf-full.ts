/**
 * FULL simulation report PDF (paying clients + admins).
 * Includes sample breakdown, full methodology, divergence caveat, map snapshot.
 */

import type { SimReportData, SimReportOptionShare, SimReportSegmentRow } from './types.ts'
import {
  divergenceUnavailableLabel,
  formatCount,
  formatDateEs,
  formatDateTimeEs,
  formatDivergenceScore,
  formatPctShare,
  isSmallRealSample,
} from './format.ts'
import { optionFillRgb } from '../sim-viewer/map-option-color.ts'
import {
  COLOR_BG_AMBER,
  COLOR_BG_LIGHT,
  COLOR_MUTED,
  COLOR_TEAL,
  COLOR_TEXT,
  CONTENT_W,
  MARGIN_X,
  PAGE_H,
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

/** Logo box: ~100px tall at 96dpi ≈ 26.5mm; keep square aspect of the mark. */
const LOGO_H_MM = 26
const LOGO_W_MM = (229 / 233) * LOGO_H_MM
const HEADER_H = 34

function drawHeader(ctx: PdfCtx, logo: string | null, generatedAt: string): void {
  const { doc } = ctx
  doc.setFillColor(...COLOR_TEAL)
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F')
  if (logo) {
    try {
      // White chip — mark is designed for light backgrounds.
      const pad = 1.5
      const boxX = MARGIN_X
      const boxY = (HEADER_H - LOGO_H_MM) / 2 - pad
      const boxW = LOGO_W_MM + pad * 2
      const boxH = LOGO_H_MM + pad * 2
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'F')
      doc.addImage(logo, 'PNG', boxX + pad, boxY + pad, LOGO_W_MM, LOGO_H_MM)
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
  // First bar row ≈ 14mm (label + bar + gap).
  drawSection(ctx, title, { minContentBelow: rows.length === 0 ? 8 : 14 })
  if (rows.length === 0) {
    drawMuted(ctx, '—')
    return
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    // Label + bar stay together; leave breathing room before the next option.
    ensureSpace(ctx, 14)
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
    // Tight under its own label
    ctx.y += 2.2
    const barW = CONTENT_W
    ctx.doc.setFillColor(...COLOR_BG_LIGHT)
    ctx.doc.rect(MARGIN_X, ctx.y, barW, 3.5, 'F')
    if (row.share != null && Number.isFinite(row.share) && row.share > 0) {
      const rgb = optionFillRgb(i)
      ctx.doc.setFillColor(rgb[0], rgb[1], rgb[2])
      ctx.doc.rect(MARGIN_X, ctx.y, barW * Math.min(1, row.share), 3.5, 'F')
    }
    // Extra gap before the next label so bars don't look shared
    ctx.y += 11
  }
}

/**
 * Colour legend for the map: each swatch = optionDotFill index, label =
 * Spanish option text from the Pulse. Drawn with jsPDF Helvetica (no tofu).
 */
function drawMapOptionLegend(
  ctx: PdfCtx,
  options: SimReportOptionShare[],
): void {
  const caption =
    'Cada punto es una persona sintética de la corrida; el color indica la opción que eligió.'
  const lineH = 5.5
  const legendH = Math.max(1, options.length) * lineH + 8
  ensureSpace(ctx, legendH + 10)
  drawMuted(ctx, caption, 8.5)
  ctx.y += 1
  for (let i = 0; i < options.length; i++) {
    const o = options[i]!
    const rgb = optionFillRgb(i)
    ensureSpace(ctx, lineH + 1)
    ctx.doc.setFillColor(rgb[0], rgb[1], rgb[2])
    ctx.doc.circle(MARGIN_X + 2.2, ctx.y - 1.1, 2.0, 'F')
    ctx.doc.setFont('helvetica', 'normal')
    ctx.doc.setFontSize(9)
    ctx.doc.setTextColor(...COLOR_TEXT)
    const label = o.label?.trim() ? o.label : `Opción ${i + 1}`
    ctx.doc.text(label, MARGIN_X + 7, ctx.y)
    ctx.y += lineH
  }
  ctx.y += 2
}

function drawSegmentTable(
  ctx: PdfCtx,
  title: string,
  segments: SimReportSegmentRow[],
  optionLabels: Record<string, string>,
): void {
  // Prefetch first row height so the section title never orphans alone.
  let firstBlockH = 8
  if (segments.length > 0) {
    const seg0 = segments[0]!
    const parts: string[] = []
    for (const [optId, count] of Object.entries(seg0.optionCounts)) {
      const label = optionLabels[optId] ?? optId
      const pct = seg0.count > 0 ? Math.round((count / seg0.count) * 100) : null
      parts.push(`${label}: ${pct == null ? '—' : `${pct}%`}`)
    }
    const breakdown = parts.length > 0 ? parts.join(' · ') : '—'
    const breakdownLines = ctx.doc.splitTextToSize(breakdown, CONTENT_W) as string[]
    firstBlockH = 4.5 + breakdownLines.length * 3.6 + 3
  }
  drawSection(ctx, title, { minContentBelow: firstBlockH })
  if (segments.length === 0) {
    drawMuted(ctx, '—')
    return
  }
  for (const seg of segments.slice(0, 24)) {
    const parts: string[] = []
    for (const [optId, count] of Object.entries(seg.optionCounts)) {
      const label = optionLabels[optId] ?? optId
      const pct = seg.count > 0 ? Math.round((count / seg.count) * 100) : null
      parts.push(`${label}: ${pct == null ? '—' : `${pct}%`}`)
    }
    const breakdown = parts.length > 0 ? parts.join(' · ') : '—'
    const breakdownLines = ctx.doc.splitTextToSize(breakdown, CONTENT_W) as string[]
    const blockH = 4.5 + breakdownLines.length * 3.6 + 3
    // Keep alcaldía/age/NSE header with its breakdown across page breaks.
    ensureSpace(ctx, blockH)
    ctx.doc.setFont('helvetica', 'bold')
    ctx.doc.setFontSize(9)
    ctx.doc.setTextColor(...COLOR_TEXT)
    ctx.doc.text(`${seg.label}  (n=${seg.count})`, MARGIN_X, ctx.y)
    ctx.y += 4.5
    drawMuted(ctx, breakdown, 8, { skipEnsure: true })
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
  ctx.y = HEADER_H + 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...COLOR_TEXT)
  const titleLines = doc.splitTextToSize(data.question, CONTENT_W) as string[]
  doc.text(titleLines, MARGIN_X, ctx.y)
  ctx.y += titleLines.length * 6 + 6

  // Meta — keep heading with first key/value row.
  drawSection(ctx, 'Datos de la corrida', { minContentBelow: 8 })
  drawKeyValue(ctx, 'Modelo', dash(data.run.model))
  drawKeyValue(ctx, 'Versión de personas', dash(data.run.personaVersion))
  drawKeyValue(ctx, 'Agentes', formatCount(data.run.personaCount))
  drawKeyValue(ctx, 'Fecha de corrida', formatDateEs(data.run.completedAt))
  drawKeyValue(ctx, 'Revelada', formatDateEs(data.run.revealedAt))
  if (data.run.isFixture) {
    drawMuted(ctx, 'FIXTURE — datos de demostración, no una corrida real.')
  }

  // Divergence — keep heading with the amber score box.
  drawSection(ctx, 'Divergencia simulado vs real', { minContentBelow: 20 })
  doc.setFillColor(...COLOR_BG_AMBER)
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
  if (data.realResultsNote) {
    drawMuted(ctx, data.realResultsNote)
  } else if (data.real == null || !data.divergence.hasRealData) {
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

  // Metodología — keep heading with the first paragraph.
  {
    const first = data.methodologyFull[0] ?? '—'
    const lines = doc.splitTextToSize(first, CONTENT_W) as string[]
    const firstParaH = Math.min(lines.length, 4) * (9 * 0.42) + 3
    drawSection(ctx, 'Metodología', { minContentBelow: firstParaH })
  }
  for (const para of data.methodologyFull) {
    drawParagraph(ctx, para, 9)
  }

  // Map snapshot — reserve heading + image start (or full block when short)
  // so the title never orphans while the PNG starts on the next page.
  {
    const imgW = CONTENT_W
    const imgH =
      data.mapPng && data.mapPng.length > 0 ? (imgW * 720) / 900 : 0
    const legendLines = Math.max(1, data.simulated.length)
    const legendBlock = 14 + legendLines * 5.5
    const headingH = 16
    const contentBelow =
      data.mapPng && data.mapPng.length > 0
        ? Math.min(imgH + legendBlock, PAGE_H - 50)
        : 12
    ensureSpace(ctx, headingH + contentBelow)
    ctx.y += 5
    ctx.doc.setFont('helvetica', 'bold')
    ctx.doc.setFontSize(10)
    ctx.doc.setTextColor(...COLOR_TEAL)
    ctx.doc.text('MAPA DE LA MUESTRA (AGEB)', MARGIN_X, ctx.y)
    ctx.y += 6
    ctx.doc.setDrawColor(...COLOR_TEAL)
    ctx.doc.setLineWidth(0.3)
    ctx.doc.line(MARGIN_X, ctx.y, MARGIN_X + CONTENT_W, ctx.y)
    ctx.y += 5

    if (data.mapPng && data.mapPng.length > 0) {
      try {
        // If the image still doesn't fit after the heading (oversized), bump.
        ensureSpace(ctx, Math.min(imgH + 4, PAGE_H - 40))
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
        drawMapOptionLegend(ctx, data.simulated)
        drawMuted(
          ctx,
          'Inset: CDMX con la muestra resaltada. Fuente cartográfica: INEGI (AGEB / marco geoestadístico).',
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
  }

  drawSection(ctx, 'Ver el Pulse', { minContentBelow: qr ? 36 : 10 })
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
