/**
 * Sponsor Pulse executive report — PDF builder.
 *
 * Mirrors the data shape used by `components/sponsor/SponsorReportView.tsx`
 * but renders into A4 portrait via jsPDF (already a dependency, used by
 * the ESG report). No new packages.
 *
 * Layout: single column, ~420pt content width, branded teal header,
 * page numbers in footer.
 */

import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

import type { SponsorPulseReportSnapshot } from '@/lib/agents/sponsor-pulse-report-agent'

export interface SponsorPulseReportPdfInput {
  sponsor: {
    companyName: string
    /** Data URL or remote URL — embedded as PNG. */
    logoBase64?: string | null
  }
  market: {
    title: string
    descriptionShort: string | null
    status: string | null
    createdAt: string
    resolutionDate: string | null
    resolvedAt: string | null
  }
  report: {
    executiveSummary: string | null
    convictionAnalysis: string | null
    nextSteps: string[]
    snapshot: SponsorPulseReportSnapshot | null
    generatedAt: string | null
  }
}

const PAGE_W = 210 // A4 mm
const PAGE_H = 297
const MARGIN_X = 16
const CONTENT_W = PAGE_W - MARGIN_X * 2

// Brand colors — match the dashboard.
const COLOR_TEAL: [number, number, number] = [16, 185, 129]
const COLOR_TEXT: [number, number, number] = [30, 41, 59]
const COLOR_MUTED: [number, number, number] = [100, 116, 139]
const COLOR_AMBER: [number, number, number] = [180, 120, 24]
const COLOR_BG_AMBER: [number, number, number] = [254, 243, 199]
const COLOR_BG_LIGHT: [number, number, number] = [245, 247, 250]

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${Math.round(value * 100)}%`
}

/** Build a PDF buffer for a sponsor Pulse executive report. */
export function generateSponsorPulseReportPDF(
  input: SponsorPulseReportPdfInput
): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ctx: PdfCtx = { doc, y: 0 }

  drawHeader(ctx, input)
  ctx.y = 50
  drawTitleBlock(ctx, input)
  drawStats(ctx, input.report.snapshot)

  if (input.report.executiveSummary) {
    drawSection(ctx, 'RESUMEN EJECUTIVO')
    drawParagraph(ctx, input.report.executiveSummary)
  }

  if (input.report.snapshot) {
    drawSection(ctx, 'DISTRIBUCIÓN DE VOTOS')
    drawOutcomes(ctx, input.report.snapshot)
  }

  if (input.report.convictionAnalysis) {
    drawSection(ctx, 'ANÁLISIS DE CONVICCIÓN')
    drawParagraph(ctx, input.report.convictionAnalysis)
    if (input.report.snapshot) {
      drawDivergenceCallout(ctx, input.report.snapshot)
    }
  }

  if (input.report.snapshot && input.report.snapshot.topReasonings.length > 0) {
    drawSection(ctx, 'RAZONES DE VOTANTES (ANONIMIZADAS)')
    drawReasonings(ctx, input.report.snapshot)
  }

  if (input.report.snapshot && input.report.snapshot.votesByDay.length > 0) {
    drawSection(ctx, 'PARTICIPACIÓN EN EL TIEMPO')
    drawParticipation(ctx, input.report.snapshot)
  }

  if (input.report.nextSteps.length > 0) {
    drawSection(ctx, 'RECOMENDACIONES SIGUIENTES')
    drawNextSteps(ctx, input.report.nextSteps)
  }

  drawSection(ctx, 'METODOLOGÍA')
  drawParagraph(
    ctx,
    `Esta es una consulta participativa pública (Pulse), no una encuesta probabilística. Los resultados reflejan la opinión de quienes decidieron participar a través de crowdconscious.app y enlaces compartidos. N = ${input.report.snapshot?.totalVotes ?? 0}. Los datos personales se mantienen anónimos: ninguna razón mostrada incluye usuario, correo o IP. Las citas fueron parafraseadas o truncadas cuando incluían información identificable.`
  )

  drawFooterAllPages(doc, input)

  // jsPDF returns ArrayBuffer; convert to Node Buffer for Supabase storage.
  const ab = doc.output('arraybuffer') as ArrayBuffer
  return Buffer.from(ab)
}

// ----- internals --------------------------------------------------------

interface PdfCtx {
  doc: jsPDF
  y: number
}

function ensureSpace(ctx: PdfCtx, needed: number): void {
  if (ctx.y + needed > PAGE_H - 18) {
    ctx.doc.addPage()
    ctx.y = 18
  }
}

function drawHeader(ctx: PdfCtx, input: SponsorPulseReportPdfInput): void {
  const { doc } = ctx
  // Teal banner across the top.
  doc.setFillColor(...COLOR_TEAL)
  doc.rect(0, 0, PAGE_W, 32, 'F')

  if (input.sponsor.logoBase64) {
    try {
      doc.addImage(input.sponsor.logoBase64, 'PNG', MARGIN_X, 8, 28, 12)
    } catch {
      // ignore — fall back to text-only header.
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.text(input.sponsor.companyName, PAGE_W - MARGIN_X, 14, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Reporte ejecutivo · Crowd Conscious', PAGE_W - MARGIN_X, 20, {
    align: 'right',
  })
  doc.text(`Generado: ${fmtDateTime(input.report.generatedAt)}`, PAGE_W - MARGIN_X, 25, {
    align: 'right',
  })
}

function drawTitleBlock(ctx: PdfCtx, input: SponsorPulseReportPdfInput): void {
  const { doc } = ctx
  doc.setTextColor(...COLOR_TEXT)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  const titleLines = doc.splitTextToSize(input.market.title, CONTENT_W)
  doc.text(titleLines, MARGIN_X, ctx.y)
  ctx.y += titleLines.length * 6.5 + 1

  if (input.market.descriptionShort) {
    doc.setTextColor(...COLOR_MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const descLines = doc.splitTextToSize(input.market.descriptionShort, CONTENT_W)
    doc.text(descLines, MARGIN_X, ctx.y)
    ctx.y += descLines.length * 5
  }

  doc.setTextColor(...COLOR_MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const dateRange = `Periodo: ${fmtDate(input.market.createdAt)} → ${fmtDate(input.market.resolvedAt ?? input.market.resolutionDate)}`
  doc.text(dateRange, MARGIN_X, ctx.y + 4)
  ctx.y += 9
}

function drawStats(ctx: PdfCtx, snap: SponsorPulseReportSnapshot | null): void {
  if (!snap) return
  const { doc } = ctx
  ensureSpace(ctx, 22)

  const stats = [
    { label: 'Total votos', value: snap.totalVotes.toLocaleString('es-MX') },
    {
      label: 'Confianza promedio',
      value: snap.avgConfidence != null ? `${snap.avgConfidence.toFixed(1)}/10` : '—',
    },
    { label: 'Registrados', value: snap.registeredVotes.toLocaleString('es-MX') },
    { label: 'Invitados', value: snap.guestVotes.toLocaleString('es-MX') },
  ]

  const cellW = CONTENT_W / stats.length
  const cellH = 16
  stats.forEach((s, i) => {
    const x = MARGIN_X + i * cellW
    doc.setFillColor(...COLOR_BG_LIGHT)
    doc.roundedRect(x + 1, ctx.y, cellW - 2, cellH, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(s.label, x + 4, ctx.y + 5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COLOR_TEXT)
    doc.text(s.value, x + 4, ctx.y + 12)
  })
  ctx.y += cellH + 6
}

function drawSection(ctx: PdfCtx, label: string): void {
  ensureSpace(ctx, 14)
  ctx.doc.setFont('helvetica', 'bold')
  ctx.doc.setFontSize(9)
  ctx.doc.setTextColor(...COLOR_MUTED)
  ctx.doc.text(label, MARGIN_X, ctx.y + 3)
  ctx.doc.setDrawColor(...COLOR_TEAL)
  ctx.doc.setLineWidth(0.6)
  ctx.doc.line(MARGIN_X, ctx.y + 5, MARGIN_X + 28, ctx.y + 5)
  ctx.y += 9
}

function drawParagraph(ctx: PdfCtx, text: string): void {
  const { doc } = ctx
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLOR_TEXT)
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[]
  for (const line of lines) {
    ensureSpace(ctx, 5)
    doc.text(line, MARGIN_X, ctx.y + 4)
    ctx.y += 5
  }
  ctx.y += 3
}

function drawOutcomes(ctx: PdfCtx, snap: SponsorPulseReportSnapshot): void {
  const { doc } = ctx
  for (let i = 0; i < snap.outcomes.length; i++) {
    const o = snap.outcomes[i]
    const isLeader = i === 0
    ensureSpace(ctx, 14)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COLOR_TEXT)
    const label = doc.splitTextToSize(o.label, CONTENT_W - 14) as string[]
    doc.text(label[0] ?? '', MARGIN_X, ctx.y + 4)

    const pctText = fmtPct(o.pct)
    doc.text(pctText, MARGIN_X + CONTENT_W, ctx.y + 4, { align: 'right' })

    // Bar.
    const barTop = ctx.y + 6
    doc.setFillColor(225, 232, 240)
    doc.roundedRect(MARGIN_X, barTop, CONTENT_W, 2.5, 1.25, 1.25, 'F')
    if (o.pct > 0) {
      doc.setFillColor(...(isLeader ? COLOR_TEAL : ([148, 163, 184] as [number, number, number])))
      doc.roundedRect(
        MARGIN_X,
        barTop,
        Math.max(2, CONTENT_W * o.pct),
        2.5,
        1.25,
        1.25,
        'F'
      )
    }

    ctx.y += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_MUTED)
    const conf = o.avgConfidence != null ? `${o.avgConfidence.toFixed(1)}/10` : 's/d'
    doc.text(
      `${o.votes.toLocaleString('es-MX')} votos · confianza ${conf}`,
      MARGIN_X,
      ctx.y + 1
    )
    ctx.y += 4

    if (o.subtitle) {
      const subLines = doc.splitTextToSize(o.subtitle, CONTENT_W) as string[]
      doc.setFont('helvetica', 'italic')
      for (const line of subLines.slice(0, 2)) {
        ensureSpace(ctx, 4)
        doc.text(line, MARGIN_X, ctx.y + 4)
        ctx.y += 4
      }
    }
    ctx.y += 4
  }
}

function drawDivergenceCallout(ctx: PdfCtx, snap: SponsorPulseReportSnapshot): void {
  const sortedByVotes = [...snap.outcomes].sort((a, b) => b.pct - a.pct)
  const sortedByConf = [...snap.outcomes].sort(
    (a, b) => (b.avgConfidence ?? 0) - (a.avgConfidence ?? 0)
  )
  const v = sortedByVotes[0]
  const c = sortedByConf[0]
  if (!v || !c || v.id === c.id) return

  const text = `Divergencia votos ↔ convicción: la opción más votada fue "${v.label}" con ${fmtPct(v.pct)} (${v.votes} votos), pero "${c.label}" obtuvo la mayor confianza promedio (${
    c.avgConfidence != null ? `${c.avgConfidence.toFixed(1)}/10` : '—'
  } vs ${
    v.avgConfidence != null ? `${v.avgConfidence.toFixed(1)}/10` : '—'
  }). Quienes votaron por la opción minoritaria lo hicieron con mayor certeza.`

  const { doc } = ctx
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lines = doc.splitTextToSize(text, CONTENT_W - 8) as string[]
  const blockH = lines.length * 4.5 + 6
  ensureSpace(ctx, blockH)

  doc.setFillColor(...COLOR_BG_AMBER)
  doc.roundedRect(MARGIN_X, ctx.y, CONTENT_W, blockH, 2, 2, 'F')
  doc.setTextColor(...COLOR_AMBER)
  doc.text(lines, MARGIN_X + 4, ctx.y + 5)
  ctx.y += blockH + 4
}

function drawReasonings(ctx: PdfCtx, snap: SponsorPulseReportSnapshot): void {
  const { doc } = ctx
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  for (const r of snap.topReasonings) {
    const labelLine = `${r.outcomeLabel} · conf ${r.confidence}/10`
    const quote = `"${r.snippet}"`
    const labelLines = doc.splitTextToSize(labelLine, CONTENT_W) as string[]
    const quoteLines = doc.splitTextToSize(quote, CONTENT_W - 4) as string[]
    const total = labelLines.length * 4 + quoteLines.length * 4 + 4
    ensureSpace(ctx, total)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR_TEAL)
    doc.text(labelLines, MARGIN_X, ctx.y + 4)
    ctx.y += labelLines.length * 4

    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...COLOR_TEXT)
    doc.text(quoteLines, MARGIN_X + 2, ctx.y + 4)
    ctx.y += quoteLines.length * 4 + 3
  }
}

function drawParticipation(
  ctx: PdfCtx,
  snap: SponsorPulseReportSnapshot
): void {
  const { doc } = ctx
  const data = snap.votesByDay
  const max = Math.max(1, ...data.map((d) => d.count))
  const peak = data.reduce((acc, d) => (d.count > acc.count ? d : acc), data[0])

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_TEXT)

  const labelW = 22
  const countW = 12
  const barW = CONTENT_W - labelW - countW - 4

  for (const d of data) {
    ensureSpace(ctx, 5)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(d.date, MARGIN_X, ctx.y + 3)

    const barX = MARGIN_X + labelW
    const barY = ctx.y + 1
    const filled = (d.count / max) * barW
    doc.setFillColor(225, 232, 240)
    doc.roundedRect(barX, barY, barW, 2.5, 1, 1, 'F')
    doc.setFillColor(
      ...(d.date === peak.date
        ? COLOR_TEAL
        : ([148, 197, 175] as [number, number, number]))
    )
    doc.roundedRect(barX, barY, Math.max(1, filled), 2.5, 1, 1, 'F')

    doc.setTextColor(...COLOR_TEXT)
    doc.text(String(d.count), MARGIN_X + CONTENT_W, ctx.y + 3, { align: 'right' })
    ctx.y += 5
  }
  ctx.y += 4

  if (data.length > 1) {
    drawParagraph(
      ctx,
      `Día con mayor participación: ${peak.date} (${peak.count} votos).`
    )
  }
}

function drawNextSteps(ctx: PdfCtx, steps: string[]): void {
  const { doc } = ctx
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLOR_TEXT)
  steps.forEach((s, i) => {
    const num = `${i + 1}.`
    const lines = doc.splitTextToSize(s, CONTENT_W - 8) as string[]
    const blockH = lines.length * 5 + 1
    ensureSpace(ctx, blockH)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLOR_TEAL)
    doc.text(num, MARGIN_X, ctx.y + 4)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLOR_TEXT)
    doc.text(lines, MARGIN_X + 7, ctx.y + 4)
    ctx.y += blockH
  })
  ctx.y += 2
}

function drawFooterAllPages(
  doc: jsPDF,
  _input: SponsorPulseReportPdfInput
): void {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(225, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(MARGIN_X, PAGE_H - 12, PAGE_W - MARGIN_X, PAGE_H - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 128, 140)
    doc.text('crowdconscious.app · Reporte ejecutivo Pulse', MARGIN_X, PAGE_H - 7)
    doc.text(`Página ${i} de ${total}`, PAGE_W - MARGIN_X, PAGE_H - 7, {
      align: 'right',
    })
  }
}
