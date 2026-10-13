/**
 * Sample reading PDF for /organizaciones/demo. Same jsPDF stack as the
 * sponsor report (lib/sponsor-pulse-report-pdf.ts); fed only by the fixed,
 * fictitious demo data and watermarked on every page.
 */
import { jsPDF } from 'jspdf'
import { DEMO_ORG, DEMO_WATERMARK, responseRate, type DemoLocale, type DemoReading } from './demo-data'

const TEAL: [number, number, number] = [16, 185, 129]
const DARK: [number, number, number] = [15, 20, 25]

export function generateDemoReadingPdf(reading: DemoReading, locale: DemoLocale): Buffer {
  const es = locale === 'es'
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  const watermark = () => {
    doc.saveGraphicsState()
    doc.setGState(new (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState({ opacity: 0.08 }) as never)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(44)
    doc.setTextColor(...DARK)
    doc.text(DEMO_WATERMARK[locale].toUpperCase(), W / 2, H / 2, { align: 'center', angle: 30 })
    doc.restoreGraphicsState()
  }

  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 34, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Crowd Conscious', 15, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(es ? 'Reporte de lectura' : 'Reading report', 15, 22)
  doc.setTextColor(...TEAL)
  doc.text(DEMO_WATERMARK[locale], W - 15, 15, { align: 'right' })

  let y = 46
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(reading.title[locale], 15, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90, 90, 90)
  doc.text(`${DEMO_ORG.name} · ${reading.period[locale]}`, 15, y)
  y += 6
  const vis = reading.visibility === 'public' ? (es ? 'Pública' : 'Public') : es ? 'Privada' : 'Private'
  doc.text(
    `${es ? 'Visibilidad' : 'Visibility'}: ${vis} (${es ? 'registrada el' : 'recorded on'} ${reading.visibilityLockedAt})`,
    15,
    y
  )
  y += 10

  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.text(
    `${es ? 'Invitados' : 'Invited'}: ${reading.invited}   ${es ? 'Respuestas' : 'Responses'}: ${reading.responded}   ${
      es ? 'Tasa de respuesta' : 'Response rate'
    }: ${responseRate(reading)}%`,
    15,
    y
  )
  y += 12

  reading.questions.forEach((q, i) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...DARK)
    doc.text(doc.splitTextToSize(`P${i + 1}. ${q.text[locale]}`, W - 30), 15, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(
      `${q.pct}% ${es ? 'dijo que sí' : 'said yes'} · ${es ? 'certeza promedio' : 'average certainty'} ${q.avgCertainty.toFixed(1)} / 10`,
      15,
      y
    )
    y += 5
    const max = Math.max(...q.distribution, 1)
    const bw = 12
    q.distribution.forEach((v, j) => {
      const h = (v / max) * 22
      doc.setFillColor(...(j >= 7 ? TEAL : j >= 4 ? ([110, 220, 180] as [number, number, number]) : ([245, 180, 60] as [number, number, number])))
      doc.rect(15 + j * (bw + 2), y + 24 - h, bw, h, 'F')
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text(String(j + 1), 15 + j * (bw + 2) + bw / 2, y + 28, { align: 'center' })
    })
    y += 38
  })

  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  const note = es
    ? 'Nota metodológica: reportamos invitados, respuestas y tasa de respuesta. No prometemos un margen de error; quien no responde puede pensar distinto. Este documento es una muestra con datos ficticios.'
    : 'Methodology note: we report invitees, responses and response rate. We do not promise a margin of error; people who do not answer may think differently. This document is a sample with fictitious data.'
  doc.text(doc.splitTextToSize(note, W - 30), 15, Math.min(y + 4, H - 24))

  watermark()
  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer)
}
