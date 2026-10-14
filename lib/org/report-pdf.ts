/**
 * Full client report PDF ("reporte completo") for a closed reading. Same
 * depth as the Oct 2026 reference report; words come from report-content.ts
 * (shared with the web report). Org rules: firm = certainty 8-10; headlines
 * name their question; weakest-first; firm segments use the highest-contrast
 * fills; reasons only via toClientReading (redacted, MIN_GROUP-gated); grey
 * text #4b5563 on white (7.6:1). No credentials, no client logos.
 * Font: Inter (OFL) embedded, so em dashes, curly quotes and «» render.
 */
import { jsPDF } from 'jspdf'
import { FIRM_THRESHOLD } from './firmness'
import { INTER_BOLD, INTER_ITALIC, INTER_REGULAR } from './fonts/inter-base64'
import { buildReportContent } from './report-content'
import type { ClientQuestion, ClientReading } from './readings'
import type { ReasonGroup } from './redact'

type RGB = [number, number, number]
const C = {
  dark: [15, 20, 25] as RGB,
  ink: [17, 24, 39] as RGB,
  grey: [75, 85, 99] as RGB,
  rule: [229, 231, 235] as RGB,
  card: [243, 244, 246] as RGB,
  green: [4, 120, 87] as RGB,
  greenLight: [110, 231, 183] as RGB,
  amber: [146, 64, 14] as RGB,
  white: [255, 255, 255] as RGB,
  coverMuted: [203, 213, 225] as RGB,
}
export const SEG = [
  { key: 'firmYes', fill: [4, 120, 87] as RGB, text: [255, 255, 255] as RGB, es: 'Sí firme', en: 'Firm yes' },
  { key: 'tentativeYes', fill: [187, 247, 208] as RGB, text: [6, 78, 59] as RGB, es: 'Sí tibio', en: 'Tentative yes' },
  { key: 'tentativeNo', fill: [254, 215, 170] as RGB, text: [124, 45, 18] as RGB, es: 'No tibio', en: 'Tentative no' },
  { key: 'firmNo', fill: [194, 65, 12] as RGB, text: [255, 255, 255] as RGB, es: 'No firme', en: 'Firm no' },
] as const

export type ReportOptions = { orgName: string; locale: 'es' | 'en'; demo: boolean; earlier?: ClientReading | null }

export function generateReadingReportPdf(r: ClientReading, o: ReportOptions): Buffer {
  if (r.status !== 'closed') throw new Error('report requires a closed reading')
  const k = buildReportContent(r, o.orgName, o.locale, o.earlier ?? null)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.addFileToVFS('Inter-Regular.ttf', INTER_REGULAR)
  doc.addFileToVFS('Inter-Bold.ttf', INTER_BOLD)
  doc.addFileToVFS('Inter-Italic.ttf', INTER_ITALIC)
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal')
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold')
  doc.addFont('Inter-Italic.ttf', 'Inter', 'italic')
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 16
  const CW = W - 2 * M
  let page = 1
  const footerText = `Crowd Conscious · ${o.orgName} · ${r.title[o.locale]} · ${r.period[o.locale]}`

  const font = (size: number, style: 'normal' | 'bold' | 'italic' = 'normal', color: RGB = C.ink) => {
    doc.setFont('Inter', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }
  const text = (s: string, x: number, y: number, w: number, lh: number) => {
    const lines = doc.splitTextToSize(s, w) as string[]
    doc.text(lines, x, y)
    return y + lines.length * lh
  }
  const eyebrow = (s: string, x: number, y: number, color: RGB = C.green) => {
    font(8, 'bold', color)
    doc.text(s.toUpperCase(), x, y, { charSpace: 0.5 })
  }
  const rule = (y: number, color: RGB = C.green) => {
    doc.setFillColor(...color)
    doc.rect(M, y, 14, 1.2, 'F')
  }
  const footer = () => {
    font(8, 'normal', C.grey)
    doc.text(doc.splitTextToSize(footerText, CW - 12)[0], M, H - 10)
    doc.text(String(page), W - M, H - 10, { align: 'right' })
    if (o.demo) {
      font(8, 'bold', C.amber)
      doc.text(k.labels.demo, W - M, 10, { align: 'right' })
    }
  }
  const newPage = () => {
    doc.addPage()
    page += 1
    footer()
  }
  const splitBar = (q: ClientQuestion, x: number, y: number, w: number, h: number) => {
    let cx = x
    for (const s of SEG) {
      const v = q.stats.split[s.key]
      if (v <= 0) continue
      const sw = (v / 100) * w
      doc.setFillColor(...s.fill)
      doc.rect(cx, y, sw, h, 'F')
      if (v >= 6) {
        font(h >= 8 ? 9 : 7.5, 'bold', s.text)
        doc.text(`${v}%`, cx + sw / 2, y + h / 2 + 1.3, { align: 'center' })
      }
      cx += sw
    }
  }
  const legend = (x: number, y: number) => {
    let lx = x
    for (const s of SEG) {
      doc.setFillColor(...s.fill)
      doc.rect(lx, y - 2.8, 3.2, 3.2, 'F')
      font(8, 'normal', C.grey)
      doc.text(s[o.locale], lx + 4.5, y)
      lx += 27
    }
    font(8, 'normal', C.grey)
    doc.text(k.firmDef, lx + 2, y)
  }
  const tiles = (ts: { v: string; l: string }[], y: number) => {
    const tw = CW / ts.length
    ts.forEach((t, i) => {
      font(20, 'bold', C.ink)
      doc.text(t.v, M + i * tw, y)
      font(8, 'normal', C.grey)
      text(t.l, M + i * tw, y + 5, tw - 4, 3.6)
    })
    return y + 14
  }
  const box = (x: number, y: number, w: number, h: number, title: string, body: string) => {
    doc.setFillColor(...C.card)
    doc.rect(x, y, w, h, 'F')
    doc.setFillColor(...C.green)
    doc.rect(x, y, 1.2, h, 'F')
    font(10, 'bold', C.ink)
    const ty = text(title, x + 5, y + 7, w - 9, 4.6)
    font(9, 'normal', C.grey)
    text(body, x + 5, ty + 1, w - 9, 4.2)
  }

  // 1. Cover
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, W, H, 'F')
  doc.setFillColor(...C.greenLight)
  doc.rect(M, 30, 14, 1.2, 'F')
  eyebrow(k.cover.eyebrow, M, 40, C.greenLight)
  font(34, 'bold', C.white)
  let y = text(k.cover.title, M, 62, CW - 20, 13)
  font(13, 'normal', C.coverMuted)
  y = text(k.cover.sub, M, y + 6, CW - 30, 6)
  if (k.cover.dates) {
    font(9.5, 'normal', C.coverMuted)
    text(k.cover.dates, M, y + 6, CW, 4.5)
  }
  if (o.demo) {
    font(9, 'bold', [252, 211, 77])
    doc.text(k.labels.demo, M, H - 48)
  }
  font(10, 'bold', C.white)
  doc.text(k.cover.footer, M, H - 30)
  font(9.5, 'normal', C.coverMuted)
  doc.text(k.cover.forWhom, M, H - 24)

  // 2. Letter
  newPage()
  rule(22)
  eyebrow(o.locale === 'es' ? 'Una nota antes de empezar' : 'A note before we start', M, 30)
  font(20, 'bold', C.ink)
  y = text(k.letter.title, M, 42, CW, 8) + 4
  for (const p of k.letter.paragraphs) {
    font(11, 'normal', C.ink)
    y = text(p, M, y, CW - 20, 5.6) + 4
  }
  font(11, 'normal', C.ink)
  doc.text(k.letter.signoff, M, y + 4)
  font(11, 'bold', C.ink)
  doc.text(k.letter.signature, M, y + 10)

  // 3. At a glance
  newPage()
  eyebrow(k.glanceLabel, M, 24)
  font(19, 'bold', C.ink)
  y = text(k.head?.main ?? '', M, 36, CW, 8)
  if (k.head?.sub) {
    font(11, 'normal', C.grey)
    y = text(k.head.sub, M, y + 1, CW, 5.2)
  }
  y = tiles(k.tiles, y + 12)
  font(8.5, 'normal', C.grey)
  y = text(k.eachQ, M, y + 2, CW, 4)
  for (const q of k.ordered) {
    font(9.5, 'bold', C.ink)
    const ny = text(`${k.numLabel(q)}. «${q.text[o.locale]}»`, M, y + 4, CW * 0.62, 4.4)
    font(8.5, 'normal', C.grey)
    doc.text(k.qLine(q), W - M, y + 4, { align: 'right' })
    splitBar(q, M, ny, CW, 6)
    y = ny + 10
  }
  legend(M, y + 1)
  y += 8
  const bw = (CW - 6) / 2
  const bh = 30
  k.insights.forEach((b, i) => box(M + (i % 2) * (bw + 6), y + Math.floor(i / 2) * (bh + 5), bw, bh, b.t, b.b))
  y += 2 * (bh + 5) + 2
  font(8, 'normal', C.grey)
  text(k.caveat, M, Math.min(y, H - 18), CW, 3.8)

  // 4. Deep dives, weakest first
  for (const d of k.deepDives) {
    const q = d.q
    newPage()
    rule(18)
    eyebrow(d.eyebrow, M, 26)
    font(18, 'bold', C.ink)
    y = text(d.title, M, 38, CW, 7.5)
    y = tiles(d.tiles, y + 10)
    if (d.preliminary) {
      box(M, y + 2, CW, 18, d.preliminary.t, d.preliminary.b)
      y += 24
    } else if (d.headline) {
      font(14, 'bold', C.ink)
      y = text(d.headline, M, y + 4, CW, 6.2)
    }
    font(8.5, 'normal', C.grey)
    doc.text(k.labels.fourGroups, M, y + 4)
    splitBar(q, M, y + 6, CW, 12)
    legend(M, y + 25)
    y += 33
    font(10, 'bold', C.ink)
    doc.text(k.labels.howSure, M, y)
    font(8.5, 'normal', C.grey)
    doc.text(k.labels.howSureSub, M, y + 4.5)
    const top = y + 9
    const ch = 32
    const colW = CW / 10
    const max = Math.max(1, ...q.counts.yes, ...q.counts.no)
    for (let i = 0; i < 10; i++) {
      const firm = i + 1 >= FIRM_THRESHOLD
      const yh = (q.counts.yes[i] / max) * ch
      const nh = (q.counts.no[i] / max) * ch
      const bx = M + i * colW + 2
      const bwid = (colW - 5) / 2
      doc.setFillColor(...(firm ? SEG[0].fill : SEG[1].fill))
      doc.rect(bx, top + ch - yh, bwid, yh, 'F')
      doc.setFillColor(...(firm ? SEG[3].fill : SEG[2].fill))
      doc.rect(bx + bwid + 1, top + ch - nh, bwid, nh, 'F')
      font(7.5, 'normal', C.grey)
      doc.text(String(q.counts.yes[i]), bx + bwid / 2, top + ch - yh - 1, { align: 'center' })
      doc.text(String(q.counts.no[i]), bx + bwid * 1.5 + 1, top + ch - nh - 1, { align: 'center' })
      font(8.5, firm ? 'bold' : 'normal', C.ink)
      doc.text(String(i + 1), bx + bwid + 0.5, top + ch + 4.5, { align: 'center' })
    }
    doc.setDrawColor(...C.rule)
    doc.line(M, top + ch, W - M, top + ch)
    font(8, 'normal', C.grey)
    doc.text(k.labels.chartKey, M, top + ch + 10)
    y = top + ch + 18
    font(11, 'bold', C.ink)
    doc.text(k.labels.seen, M, y)
    y += 6
    font(10, 'normal', C.ink)
    for (const s of d.seen) y = text(s, M, y, CW, 4.8) + 2.5

    // In their own words
    newPage()
    eyebrow(k.labels.wordsEyebrow(d.num), M, 24)
    font(18, 'bold', C.ink)
    y = text(k.labels.wordsTitle, M, 36, CW, 7)
    font(9, 'normal', C.grey)
    y = text(d.wordsIntro, M, y + 1, CW, 4.3)
    const col = (title: string, g: ReasonGroup, x: number, y0: number, w: number) => {
      font(8.5, 'bold', C.green)
      text(title.toUpperCase(), x, y0, w, 4)
      let yy = y0 + 7
      if (g.hidden) {
        font(9.5, 'italic', C.grey)
        return text(k.hiddenNote(g.groupSize), x, yy, w, 4.4)
      }
      if (!g.reasons.length) {
        font(9.5, 'italic', C.grey)
        return text(k.labels.noneLeft, x, yy, w, 4.4)
      }
      for (const rr of g.reasons) {
        doc.setFillColor(...C.green)
        doc.rect(x, yy - 3.2, 0.9, 4, 'F')
        font(10, 'italic', C.ink)
        yy = text(`“${rr.text}”`, x + 3.5, yy, w - 4, 4.6)
        font(8, 'normal', C.grey)
        doc.text(k.labels.certainty(rr.certainty), x + 3.5, yy)
        yy += 6
      }
      return yy
    }
    const cw = (CW - 8) / 2
    const y1 = col(d.doubtTitle, q.reasons.doubt, M, y + 8, cw)
    const y2 = col(d.noTitle, q.reasons.no, M + cw + 8, y + 8, cw)
    font(8, 'normal', C.grey)
    text(k.labels.wordsFoot, M, Math.max(y1, y2) + 6, CW, 3.8)
  }

  // 5. To discuss
  newPage()
  eyebrow(k.labels.talkEyebrow, M, 24)
  font(18, 'bold', C.ink)
  y = text(k.labels.talkTitle, M, 36, CW, 7)
  font(9, 'normal', C.grey)
  y = text(k.labels.talkSub, M, y + 1, CW, 4.3) + 4
  k.talk.forEach((tk, i) => {
    doc.setFillColor(...C.green)
    doc.circle(M + 4, y + 2, 4, 'F')
    font(10, 'bold', C.white)
    doc.text(String(i + 1), M + 4, y + 3.5, { align: 'center' })
    font(11, 'bold', C.ink)
    const yy = text(tk.t, M + 12, y + 3.5, CW - 12, 5)
    font(10, 'normal', C.ink)
    y = text(tk.b, M + 12, yy + 0.5, CW - 12, 4.8) + 6
  })

  // 6. Methodology
  newPage()
  eyebrow(k.labels.methodEyebrow, M, 24)
  font(18, 'bold', C.ink)
  y = text(k.labels.methodTitle, M, 36, CW, 7) + 2
  // Measure first so the dark panel fits its text.
  font(9, 'normal')
  const mh = k.method.reduce((a, m) => a + Math.max((doc.splitTextToSize(m.b, CW - 54) as string[]).length * 4.2, 5) + 4, 10)
  doc.setFillColor(...C.dark)
  doc.rect(M, y, CW, mh, 'F')
  let my = y + 9
  for (const m of k.method) {
    font(9.5, 'bold', C.white)
    text(m.t, M + 6, my, 40, 4.2)
    font(9, 'normal', C.coverMuted)
    my = Math.max(text(m.b, M + 48, my, CW - 54, 4.2), my + 5) + 4
  }
  y += mh + 8
  font(11, 'bold', C.ink)
  doc.text(k.labels.tableTitle, M, y)
  y += 6
  const cx = [M, M + 82, M + 98, M + 112, M + 140, M + 162]
  font(8, 'bold', C.grey)
  k.labels.tableCols.forEach((c, i) => doc.text(c, cx[i], y))
  y += 2
  doc.setDrawColor(...C.rule)
  doc.line(M, y, W - M, y)
  y += 5
  r.questions.forEach((q, i) => {
    font(8.5, 'normal', C.ink)
    const qy = text(`${k.numLabel(q)}. ${q.text[o.locale]}`, cx[0], y, 78, 4)
    ;[String(q.stats.responses), `${q.stats.pctYes}%`, `${q.stats.pctFirmOfYes}%`, q.stats.yesCertainty.toFixed(1), `${q.stats.split.firmNo}%`].forEach((v, j) => doc.text(v, cx[j + 1], y))
    y = qy + 2
    doc.line(M, y - 1, W - M, y - 1)
    y += 3
    void i
  })

  // 7. About (back cover)
  newPage()
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, W, H, 'F')
  eyebrow(k.about.eyebrow, M, 70, C.greenLight)
  font(24, 'bold', C.white)
  y = text(k.about.title, M, 84, CW - 20, 10)
  font(11, 'normal', C.coverMuted)
  y = text(k.about.body, M, y + 6, CW - 20, 5.6)
  font(16, 'bold', C.greenLight)
  doc.text(k.about.url, M, y + 12)
  font(9.5, 'normal', C.coverMuted)
  doc.text(k.about.email, M, y + 19)
  if (o.demo) {
    font(9, 'bold', [252, 211, 77])
    doc.text(k.labels.demo, M, H - 30)
  }
  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer)
}
