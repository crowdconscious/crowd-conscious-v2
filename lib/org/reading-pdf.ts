/**
 * Reading PDF (jsPDF, same stack as lib/sponsor-pulse-report-pdf.ts).
 * Answer first: headline, then one split bar per question (lowest firm-yes
 * first), three numbers and the methodology line. `demo` adds a small
 * "Ficticio" label on every page header and question block.
 */
import { jsPDF } from 'jspdf'
import { FIRM_THRESHOLD, computeHeadline, orderByFirmYes } from './firmness'
import { headlineSentence } from './headline-copy'
import { responseRate, type ClientReading } from './readings'

type RGB = [number, number, number]
const DARK: RGB = [15, 20, 25]
const SEG: { key: 'firmYes' | 'tentativeYes' | 'tentativeNo' | 'firmNo'; rgb: RGB; text: RGB; es: string; en: string }[] = [
  { key: 'firmYes', rgb: [52, 211, 153], text: [6, 43, 31], es: 'Sí firme', en: 'Firm yes' },
  { key: 'tentativeYes', rgb: [29, 107, 82], text: [255, 255, 255], es: 'Sí tibio', en: 'Tentative yes' },
  { key: 'tentativeNo', rgb: [107, 74, 46], text: [255, 255, 255], es: 'No tibio', en: 'Tentative no' },
  { key: 'firmNo', rgb: [240, 163, 94], text: [42, 22, 6], es: 'No firme', en: 'Firm no' },
]

export function generateReadingPdf(r: ClientReading, orgName: string, locale: 'es' | 'en', demo: boolean): Buffer {
  const es = locale === 'es'
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 15
  const CW = W - 2 * M
  const fict = es ? 'FICTICIO · datos de demostración' : 'FICTITIOUS · demo data'

  const header = () => {
    doc.setFillColor(...DARK)
    doc.rect(0, 0, W, 24, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('Crowd Conscious', M, 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(es ? 'Lectura de satisfacción con certeza' : 'Satisfaction reading with certainty', M, 17)
    if (demo) {
      doc.setTextColor(252, 211, 77)
      doc.setFont('helvetica', 'bold')
      doc.text(fict, W - M, 11, { align: 'right' })
    }
  }
  header()

  let y = 34
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(r.title[locale], M, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(`${orgName} · ${r.period[locale]}`, M, y)
  y += 10

  const qs = r.questions.map((q) => ({ ...q, label: q.text[locale] }))
  const h0 = headlineSentence(computeHeadline(qs.map((q) => ({ text: q.label, stats: q.stats }))), locale)
  // Core PDF fonts lack the em dash; keep the sentence readable.
  const h = h0 ? { main: h0.main.replace(/—/g, '-'), sub: h0.sub ? h0.sub.replace(/—/g, '-') : null } : null
  if (h) {
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    const lines = doc.splitTextToSize(h.main, CW)
    doc.text(lines, M, y)
    y += lines.length * 6.5
    if (h.sub) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.5)
      const sl = doc.splitTextToSize(h.sub, CW)
      doc.text(sl, M, y)
      y += sl.length * 5
    }
    y += 4
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  const nums = [
    `${es ? 'Invitados' : 'Invited'}: ${r.invited}`,
    `${es ? 'Respuestas' : 'Responses'}: ${r.responded}`,
    `${es ? 'Tasa de respuesta' : 'Response rate'}: ${responseRate(r)}%`,
  ]
  nums.forEach((t, i) => doc.text(t, M + i * (CW / 3), y))
  y += 10

  for (const q of orderByFirmYes(qs)) {
    if (y > H - 50) {
      doc.addPage()
      header()
      y = 34
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...DARK)
    const ql = doc.splitTextToSize(`«${q.label}»`, CW - 30)
    doc.text(ql, M, y)
    if (demo) {
      doc.setFontSize(7.5)
      doc.setTextColor(146, 64, 14)
      doc.text(es ? 'FICTICIO' : 'FICTITIOUS', W - M, y, { align: 'right' })
    }
    y += ql.length * 4.8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(50, 50, 50)
    doc.text(
      `${q.stats.pctYes}% ${es ? 'sí' : 'yes'} · ${es ? 'certeza promedio' : 'average certainty'} ${q.stats.avgCertainty.toFixed(1)} · ${q.stats.pctFirmOfYes}% ${es ? 'de los «sí», firmes' : 'of yes answers firm'}`,
      M,
      y
    )
    y += 3
    let x = M
    for (const s of SEG) {
      const v = q.stats.split[s.key]
      if (v <= 0) continue
      const w = (v / 100) * CW
      doc.setFillColor(...s.rgb)
      doc.rect(x, y, w, 8, 'F')
      if (v >= 7) {
        doc.setTextColor(...s.text)
        doc.setFont('helvetica', 'bold')
        doc.text(`${v}%`, x + w / 2, y + 5.3, { align: 'center' })
      }
      x += w
    }
    y += 15
  }

  // Legend
  let lx = M
  doc.setFontSize(8)
  for (const s of SEG) {
    doc.setFillColor(...s.rgb)
    doc.rect(lx, y - 3, 3.5, 3.5, 'F')
    doc.setTextColor(50, 50, 50)
    doc.setFont('helvetica', 'normal')
    doc.text(s[locale], lx + 5, y)
    lx += 30
  }
  doc.text(es ? `Firme = certeza ${FIRM_THRESHOLD}-10` : `Firm = certainty ${FIRM_THRESHOLD}-10`, lx + 2, y)
  y += 10

  const sample =
    r.sample.mode === 'all'
      ? es
        ? 'toda la base'
        : 'whole base'
      : es
        ? `muestra aleatoria de ${r.sample.n} sorteada por Crowd Conscious el ${r.sample.drawnAt}`
        : `random sample of ${r.sample.n} drawn by Crowd Conscious on ${r.sample.drawnAt}`
  const note = es
    ? `Metodología: ${sample}; enlaces de un solo uso; visibilidad decidida el ${r.visibilityLockedAt.slice(0, 10)}, antes de abrir la consulta; reportamos tasa de respuesta, no margen de error; quien no responde puede pensar distinto. El cliente no editó estos resultados.`
    : `Methodology: ${sample}; single-use links; visibility decided on ${r.visibilityLockedAt.slice(0, 10)}, before opening; we report response rate, not a margin of error; non-respondents may think differently. The client did not edit these results.`
  doc.setFontSize(8)
  doc.setTextColor(70, 70, 70)
  doc.text(doc.splitTextToSize(note + (demo ? ` ${fict}.` : ''), CW), M, Math.min(y, H - 22))

  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer)
}
