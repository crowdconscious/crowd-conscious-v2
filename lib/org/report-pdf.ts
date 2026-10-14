/**
 * Full client report ("reporte completo") for a closed Organizaciones reading.
 * Same depth as the Oct 2026 reference report (cover, letter, at-a-glance with
 * insight boxes, one deep dive per question, respondents' own words, things to
 * talk about, methodology, about), adapted to the org rules:
 *  - firm = certainty FIRM_THRESHOLD-10 (lib/org/firmness.ts, never redefined);
 *  - headline on a consistent base («De su X% que…, Y% lo dijo con firmeza»);
 *  - «certeza de los "sí"» = mean certainty of yes answers only;
 *  - firm segments always use the highest-contrast fills;
 *  - questions ordered weakest-first (lowest firm share of «sí»);
 *  - reasons only via toClientReading() (redacted, MIN_GROUP-gated);
 *  - under MIN_RESPONSES_FOR_HEADLINE a question is "lectura preliminar";
 *  - grey text #4b5563 on white (7.6:1), never lighter;
 *  - credentials: Hecho en México + RAE Leaders in Innovation Fellowship only; no client logos.
 * Every insight sentence is computed from the data; nothing is invented.
 * Behind NEXT_PUBLIC_ORG_PORTAL_V2 until client auth + reading storage exist.
 */
import { jsPDF } from 'jspdf'
import { FIRM_THRESHOLD, MIN_GROUP, MIN_RESPONSES_FOR_HEADLINE, orderByFirmYes } from './firmness'
import { mainSentence, readingHeadline } from './headline-copy'
import { questionTrend, responseRate, type ClientQuestion, type ClientReading } from './readings'
import type { ReasonGroup } from './redact'

type RGB = [number, number, number]
type Loc = 'es' | 'en'

const C = {
  dark: [15, 20, 25] as RGB,
  ink: [17, 24, 39] as RGB,
  grey: [75, 85, 99] as RGB, // #4b5563 on white = 7.6:1
  rule: [229, 231, 235] as RGB,
  card: [243, 244, 246] as RGB,
  green: [4, 120, 87] as RGB, // #047857
  greenLight: [110, 231, 183] as RGB,
  amber: [146, 64, 14] as RGB,
  white: [255, 255, 255] as RGB,
  coverMuted: [203, 213, 225] as RGB, // on #0f1419 = 12:1
}
const SEG = [
  { key: 'firmYes', fill: [4, 120, 87] as RGB, text: [255, 255, 255] as RGB, es: 'Sí firme', en: 'Firm yes' },
  { key: 'tentativeYes', fill: [187, 247, 208] as RGB, text: [6, 78, 59] as RGB, es: 'Sí tibio', en: 'Tentative yes' },
  { key: 'tentativeNo', fill: [254, 215, 170] as RGB, text: [124, 45, 18] as RGB, es: 'No tibio', en: 'Tentative no' },
  { key: 'firmNo', fill: [194, 65, 12] as RGB, text: [255, 255, 255] as RGB, es: 'No firme', en: 'Firm no' },
] as const

/** Core PDF fonts are Latin-1: normalise dashes and curly quotes. */
const safe = (s: string) =>
  s.replace(/[—–]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/·/g, '·')

export type ReportOptions = {
  orgName: string
  locale: Loc
  demo: boolean
  /** Earlier closed reading of the same series, for trends (exact wording only). */
  earlier?: ClientReading | null
  /** Personal letter paragraphs written by Crowd Conscious for this client; default template otherwise. */
  letter?: string[]
  /** e.g. '19 oct 2026, 23:59 h (CDMX)'. */
  dataCut?: string
}

export function generateReadingReportPdf(r: ClientReading, o: ReportOptions): Buffer {
  if (r.status !== 'closed') throw new Error('report requires a closed reading')
  const es = o.locale === 'es'
  const L = (a: string, b: string) => (es ? a : b)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 16
  const CW = W - 2 * M
  let page = 1
  const fict = L('FICTICIO · datos de demostración', 'FICTITIOUS · demo data')
  const footerText = safe(`Crowd Conscious · ${o.orgName} · ${r.title[o.locale]} · ${r.period[o.locale]}`)

  const font = (size: number, style: 'normal' | 'bold' | 'italic' = 'normal', color: RGB = C.ink) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }
  const text = (s: string, x: number, y: number, w: number, lh: number) => {
    const lines = doc.splitTextToSize(safe(s), w) as string[]
    doc.text(lines, x, y)
    return y + lines.length * lh
  }
  const eyebrow = (s: string, x: number, y: number, color: RGB = C.green) => {
    font(8, 'bold', color)
    doc.text(safe(s.toUpperCase()), x, y, { charSpace: 0.6 })
  }
  const footer = () => {
    font(8, 'normal', C.grey)
    doc.text(footerText, M, H - 10)
    doc.text(String(page), W - M, H - 10, { align: 'right' })
    if (o.demo) {
      font(8, 'bold', C.amber)
      doc.text(fict, W - M, 10, { align: 'right' })
    }
  }
  const newPage = () => {
    doc.addPage()
    page += 1
    footer()
  }
  const qLabel = (q: ClientQuestion) => q.text[o.locale]
  const qs = r.questions
  const ordered = orderByFirmYes(qs)
  const num = (q: ClientQuestion) => qs.findIndex((x) => x.id === q.id) + 1
  const pct = (n: number) => `${n}%`

  const splitBar = (q: ClientQuestion, x: number, y: number, w: number, h: number, labels = true) => {
    let cx = x
    for (const s of SEG) {
      const v = q.stats.split[s.key]
      if (v <= 0) continue
      const sw = (v / 100) * w
      doc.setFillColor(...s.fill)
      doc.rect(cx, y, sw, h, 'F')
      if (labels && v >= 6) {
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
    doc.text(safe(L(`Firme = certeza ${FIRM_THRESHOLD} a 10`, `Firm = certainty ${FIRM_THRESHOLD} to 10`)), lx + 2, y)
  }
  const statTiles = (tiles: { v: string; l: string }[], y: number) => {
    const tw = CW / tiles.length
    tiles.forEach((t, i) => {
      font(20, 'bold', C.ink)
      doc.text(safe(t.v), M + i * tw, y)
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

  // ---------- 1. Cover ----------
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, W, H, 'F')
  doc.setFillColor(...C.greenLight)
  doc.rect(M, 30, 14, 1.2, 'F')
  eyebrow(`${L('Lectura de satisfacción', 'Satisfaction reading')} · ${o.orgName} · ${r.period[o.locale]}`, M, 40, C.greenLight)
  font(34, 'bold', C.white)
  let y = text(r.title[o.locale], M, 62, CW - 20, 13)
  font(13, 'normal', C.coverMuted)
  y = text(
    L(
      `Lo que nos dijeron ${r.responded} personas, cada una con su certeza de 1 a 10. ${qs.length} ${qs.length === 1 ? 'pregunta' : 'preguntas'}, resultados sin editar.`,
      `What ${r.responded} people told us, each with their certainty from 1 to 10. ${qs.length} ${qs.length === 1 ? 'question' : 'questions'}, unedited results.`
    ),
    M,
    y + 6,
    CW - 30,
    6
  )
  if (o.dataCut) {
    font(9, 'normal', C.coverMuted)
    text(L(`Corte de datos: ${o.dataCut}.`, `Data cut: ${o.dataCut}.`), M, y + 6, CW, 4.5)
  }
  if (o.demo) {
    font(9, 'bold', [252, 211, 77])
    doc.text(fict, M, H - 48)
  }
  font(10, 'bold', C.white)
  doc.text(L('Un reporte de Crowd Conscious', 'A Crowd Conscious report'), M, H - 30)
  font(9.5, 'normal', C.coverMuted)
  doc.text(safe(L(`Para el equipo de ${o.orgName}`, `For the ${o.orgName} team`)), M, H - 24)

  // ---------- 2. Letter ----------
  newPage()
  doc.setFillColor(...C.green)
  doc.rect(M, 22, 14, 1.2, 'F')
  eyebrow(L('Una nota antes de empezar', 'A note before we start'), M, 30)
  font(20, 'bold', C.ink)
  y = text(L('Gracias por preguntar', 'Thank you for asking'), M, 42, CW, 8)
  const rate = responseRate(r)
  const letter =
    o.letter ??
    (es
      ? [
          `Querido equipo de ${o.orgName}:`,
          `Gracias por confiar en nosotros para escuchar a sus usuarios. Entre ${r.fieldOpens} y ${r.fieldCloses} invitamos a ${r.invited} personas y ${r.responded} respondieron (${rate}%). Cada respuesta trae su certeza, de 1 a 10: no solo qué piensan, sino qué tan seguros están.`,
          'Aquí están los resultados tal como llegaron. Ustedes no los editaron y nosotros tampoco. Empezamos por donde hay más duda, porque ahí suele estar lo que más vale la pena conversar.',
          `Una aclaración honesta: esto es la voz de quienes respondieron, no de todas las personas invitadas. Quien no responde puede pensar distinto. Por eso reportamos la tasa de respuesta y no un margen de error.`,
          'Gracias por la apertura. Ojalá este reporte les sirva en las conversaciones que vienen.',
        ]
      : [
          `Dear ${o.orgName} team,`,
          `Thank you for trusting us to listen to your users. Between ${r.fieldOpens} and ${r.fieldCloses} we invited ${r.invited} people and ${r.responded} answered (${rate}%). Every answer carries its certainty, from 1 to 10: not only what people think, but how sure they are.`,
          'Here are the results exactly as they came in. You did not edit them and neither did we. We start where doubt is highest, because that is usually what is most worth discussing.',
          'An honest caveat: this is the voice of those who answered, not of everyone invited. Non-respondents may think differently. That is why we report the response rate and not a margin of error.',
          'Thank you for your openness. We hope this report helps in the conversations ahead.',
        ])
  y += 4
  for (const p of letter) {
    font(11, 'normal', C.ink)
    y = text(p, M, y, CW - 20, 5.6) + 4
  }
  y += 4
  font(11, 'normal', C.ink)
  doc.text(L('Con cariño,', 'Warmly,'), M, y)
  font(11, 'bold', C.ink)
  doc.text(L('Francisco Blockstrand y el equipo de Crowd Conscious', 'Francisco Blockstrand and the Crowd Conscious team'), M, y + 6)
  font(9, 'normal', C.grey)
  doc.text(L('Francisco es fundador de Crowd Conscious', 'Francisco is the founder of Crowd Conscious'), M, y + 11)

  // ---------- 3. At a glance ----------
  newPage()
  eyebrow(L('De un vistazo', 'At a glance'), M, 24)
  const head = readingHeadline(qs, o.locale)
  font(19, 'bold', C.ink)
  y = text(head?.main ?? '', M, 36, CW, 8)
  if (head?.sub) {
    font(11, 'normal', C.grey)
    y = text(head.sub, M, y + 1, CW, 5.2)
  }
  const yesTotal = qs.reduce((a, q) => a + q.stats.yesCount, 0)
  const yesCertAll = yesTotal ? qs.reduce((a, q) => a + q.stats.yesCertainty * q.stats.yesCount, 0) / yesTotal : 0
  y = statTiles(
    [
      { v: String(r.invited), l: L('personas invitadas', 'people invited') },
      { v: String(r.responded), l: L('respondieron', 'responded') },
      { v: `${rate}%`, l: L('tasa de respuesta', 'response rate') },
      { v: yesCertAll.toFixed(1), l: L('certeza de los «sí» (1 a 10), todas las preguntas', 'certainty of "yes" answers (1-10), all questions') },
    ],
    y + 12
  )
  font(8.5, 'normal', C.grey)
  y = text(L('Cada pregunta, de menor a mayor firmeza:', 'Each question, least to most firm:'), M, y + 2, CW, 4)
  for (const q of ordered) {
    font(9.5, 'bold', C.ink)
    const ny = text(`${L('P', 'Q')}${num(q)}. «${qLabel(q)}»`, M, y + 4, CW * 0.62, 4.4)
    font(8.5, 'normal', C.grey)
    doc.text(
      safe(`${pct(q.stats.pctYes)} ${L('sí', 'yes')} · ${q.stats.pctFirmOfYes}% ${L('de los «sí», firmes', 'of yes firm')}`),
      W - M,
      y + 4,
      { align: 'right' }
    )
    splitBar(q, M, ny, CW, 6)
    y = ny + 10
  }
  legend(M, y + 1)
  y += 8
  // Insight boxes (computed facts only).
  const weakest = ordered[0]
  const strongest = ordered[ordered.length - 1]
  const mostTepid = [...qs].sort((a, b) => b.stats.split.tentativeYes - a.stats.split.tentativeYes)[0]
  const mostFirmNo = [...qs].sort((a, b) => b.stats.split.firmNo - a.stats.split.firmNo)[0]
  const leadTrend = o.earlier ? questionTrend(qs[0], 0, o.earlier) : { kind: 'none' as const }
  const boxes: { t: string; b: string }[] = [
    {
      t: L('Donde más dudan', 'Where they hesitate most'),
      b: L(
        `«${qLabel(weakest)}»: ${weakest.stats.pctFirmOfYes}% de sus «sí» son firmes; ${weakest.stats.split.tentativeYes} de cada 100 respondieron sí sin firmeza.`,
        `"${qLabel(weakest)}": ${weakest.stats.pctFirmOfYes}% of its yes answers are firm; ${weakest.stats.split.tentativeYes} in 100 said yes without firmness.`
      ),
    },
    {
      t: L('Donde hay más firmeza', 'Where they are firmest'),
      b: L(
        `«${qLabel(strongest)}»: ${strongest.stats.pctFirmOfYes}% de sus «sí» son firmes, con certeza de los «sí» de ${strongest.stats.yesCertainty.toFixed(1)}.`,
        `"${qLabel(strongest)}": ${strongest.stats.pctFirmOfYes}% of its yes answers are firm, yes certainty ${strongest.stats.yesCertainty.toFixed(1)}.`
      ),
    },
    {
      t: L('El «no» con firmeza', 'The firm "no"'),
      b: L(
        `El mayor «no» firme está en «${qLabel(mostFirmNo)}»: ${mostFirmNo.stats.split.firmNo}% de todas las respuestas.`,
        `The largest firm "no" is on "${qLabel(mostFirmNo)}": ${mostFirmNo.stats.split.firmNo}% of all answers.`
      ),
    },
    leadTrend.kind === 'delta'
      ? {
          t: L(`Contra ${leadTrend.prevPeriod.es}`, `Versus ${leadTrend.prevPeriod.en}`),
          b: L(
            `En «${qLabel(qs[0])}», el sí cambió ${leadTrend.dYes >= 0 ? '+' : ''}${leadTrend.dYes} puntos y el sí firme ${leadTrend.dFirmYes >= 0 ? '+' : ''}${leadTrend.dFirmYes} puntos.`,
            `On "${qLabel(qs[0])}", yes moved ${leadTrend.dYes >= 0 ? '+' : ''}${leadTrend.dYes} points and firm yes ${leadTrend.dFirmYes >= 0 ? '+' : ''}${leadTrend.dFirmYes} points.`
          ),
        }
      : {
          t: L('El «sí» tibio más grande', 'The largest tentative yes'),
          b: L(
            `«${qLabel(mostTepid)}»: ${mostTepid.stats.split.tentativeYes}% de todas las respuestas fueron sí con certeza menor a ${FIRM_THRESHOLD}.`,
            `"${qLabel(mostTepid)}": ${mostTepid.stats.split.tentativeYes}% of all answers were yes with certainty below ${FIRM_THRESHOLD}.`
          ),
        },
  ]
  const bw = (CW - 6) / 2
  const bh = 30
  boxes.forEach((b, i) => box(M + (i % 2) * (bw + 6), y + Math.floor(i / 2) * (bh + 5), bw, bh, b.t, b.b))
  y += 2 * (bh + 5) + 2
  font(8, 'normal', C.grey)
  text(
    L(
      `Las respuestas son de quienes respondieron (${r.responded} de ${r.invited}), no de toda la población. Más detalle en «Cómo se hizo».`,
      `Answers come from those who responded (${r.responded} of ${r.invited}), not the whole population. More in "How it was done".`
    ),
    M,
    Math.min(y, H - 18),
    CW,
    3.8
  )

  // ---------- 4. Deep dives (weakest first) ----------
  ordered.forEach((q, rank) => {
    newPage()
    doc.setFillColor(...C.green)
    doc.rect(M, 18, 14, 1.2, 'F')
    eyebrow(
      `${L('Pregunta', 'Question')} ${num(q)} ${L('de', 'of')} ${qs.length} · ${
        rank === 0 ? L('la de menor firmeza', 'least firm') : rank === ordered.length - 1 ? L('la de mayor firmeza', 'most firm') : L(`${rank + 1}.ª en firmeza`, `#${rank + 1} by firmness`)
      }`,
      M,
      26
    )
    font(18, 'bold', C.ink)
    y = text(`«${qLabel(q)}»`, M, 38, CW, 7.5)
    y = statTiles(
      [
        { v: String(q.stats.responses), l: L('respuestas', 'responses') },
        { v: pct(q.stats.pctYes), l: L('dijo que sí', 'said yes') },
        { v: pct(q.stats.pctFirmOfYes), l: L(`de los «sí», firmes (certeza ${FIRM_THRESHOLD}-10)`, `of yes answers firm (certainty ${FIRM_THRESHOLD}-10)`) },
        { v: q.stats.yesCertainty.toFixed(1), l: L('certeza de los «sí» (1 a 10)', 'certainty of yes answers (1-10)') },
      ],
      y + 10
    )
    if (q.stats.preliminary) {
      box(M, y + 2, CW, 18, L('Lectura preliminar', 'Preliminary reading'),
        L(`Menos de ${MIN_RESPONSES_FOR_HEADLINE} respuestas: mostramos los números, pero no sacamos una conclusión.`, `Fewer than ${MIN_RESPONSES_FOR_HEADLINE} responses: we show the numbers but draw no conclusion.`))
      y += 24
    } else {
      font(14, 'bold', C.ink)
      y = text(mainSentence(q.stats.pctYes, q.stats.pctFirmOfYes, q.headlinePhrase?.[o.locale], o.locale), M, y + 4, CW, 6.2)
    }
    font(8.5, 'normal', C.grey)
    doc.text(L('Todas las respuestas, en cuatro grupos', 'All answers, in four groups'), M, y + 4)
    splitBar(q, M, y + 6, CW, 12)
    legend(M, y + 25)
    y += 33

    // Certainty distribution of «sí» and «no» (counts per certainty 1..10)
    font(10, 'bold', C.ink)
    doc.text(L('Qué tan seguros estaban', 'How sure they were'), M, y)
    font(8.5, 'normal', C.grey)
    doc.text(L('Número de respuestas por nivel de certeza', 'Number of answers by certainty level'), M, y + 4.5)
    const chartTop = y + 9
    const chartH = 32
    const colW = CW / 10
    const max = Math.max(1, ...q.counts.yes, ...q.counts.no)
    for (let i = 0; i < 10; i++) {
      const firm = i + 1 >= FIRM_THRESHOLD
      const yh = (q.counts.yes[i] / max) * chartH
      const nh = (q.counts.no[i] / max) * chartH
      const bx = M + i * colW + 2
      const bwid = (colW - 5) / 2
      doc.setFillColor(...(firm ? SEG[0].fill : SEG[1].fill))
      doc.rect(bx, chartTop + chartH - yh, bwid, yh, 'F')
      doc.setFillColor(...(firm ? SEG[3].fill : SEG[2].fill))
      doc.rect(bx + bwid + 1, chartTop + chartH - nh, bwid, nh, 'F')
      font(7.5, 'normal', C.grey)
      doc.text(String(q.counts.yes[i]), bx + bwid / 2, chartTop + chartH - yh - 1, { align: 'center' })
      doc.text(String(q.counts.no[i]), bx + bwid * 1.5 + 1, chartTop + chartH - nh - 1, { align: 'center' })
      font(8.5, firm ? 'bold' : 'normal', C.ink)
      doc.text(String(i + 1), bx + bwid + 0.5, chartTop + chartH + 4.5, { align: 'center' })
    }
    doc.setDrawColor(...C.rule)
    doc.line(M, chartTop + chartH, W - M, chartTop + chartH)
    font(8, 'normal', C.grey)
    doc.text(
      safe(L(`Barra izquierda: sí · derecha: no · ${FIRM_THRESHOLD} a 10 = firme (color intenso)`, `Left bar: yes · right: no · ${FIRM_THRESHOLD} to 10 = firm (strong colour)`)),
      M,
      chartTop + chartH + 10
    )
    y = chartTop + chartH + 18

    // Lo que vemos (computed)
    font(11, 'bold', C.ink)
    doc.text(L('Lo que vemos', 'What we see'), M, y)
    const tr = o.earlier ? questionTrend(q, num(q) - 1, o.earlier) : { kind: 'none' as const }
    const seen: string[] = [
      L(
        `${q.stats.yesCount} de ${q.stats.responses} personas dijeron que sí (${q.stats.pctYes}%). De esos «sí», ${q.stats.pctFirmOfYes}% vino con certeza de ${FIRM_THRESHOLD} o más; los otros ${q.stats.tentativeYesCount} fueron «sí» tibios.`,
        `${q.stats.yesCount} of ${q.stats.responses} people said yes (${q.stats.pctYes}%). Of those, ${q.stats.pctFirmOfYes}% came with certainty ${FIRM_THRESHOLD} or higher; the other ${q.stats.tentativeYesCount} were tentative yes answers.`
      ),
      L(
        `El «no» suma ${q.stats.noCount} respuestas (${q.stats.split.tentativeNo + q.stats.split.firmNo}%), de las cuales ${q.stats.split.firmNo} de cada 100 respuestas totales son «no» firmes.`,
        `"No" adds up to ${q.stats.noCount} answers (${q.stats.split.tentativeNo + q.stats.split.firmNo}%); ${q.stats.split.firmNo} in 100 of all answers are firm "no".`
      ),
    ]
    if (tr.kind === 'delta')
      seen.push(
        L(
          `Contra ${tr.prevPeriod.es} (misma redacción): sí ${tr.dYes >= 0 ? '+' : ''}${tr.dYes} puntos, sí firme ${tr.dFirmYes >= 0 ? '+' : ''}${tr.dFirmYes} puntos.`,
          `Versus ${tr.prevPeriod.en} (same wording): yes ${tr.dYes >= 0 ? '+' : ''}${tr.dYes} points, firm yes ${tr.dFirmYes >= 0 ? '+' : ''}${tr.dFirmYes} points.`
        )
      )
    else if (tr.kind === 'modified')
      seen.push(L(`La redacción cambió respecto a ${tr.prevPeriod.es}; no la comparamos.`, `Wording changed since ${tr.prevPeriod.en}; not compared.`))
    y += 6
    font(10, 'normal', C.ink)
    for (const s of seen) y = text(s, M, y, CW, 4.8) + 2.5

    // In their own words
    newPage()
    eyebrow(`${L('Pregunta', 'Question')} ${num(q)} · ${L('en sus palabras', 'in their own words')}`, M, 24)
    font(18, 'bold', C.ink)
    y = text(L('Lo que escribieron', 'What they wrote'), M, 36, CW, 7)
    font(9, 'normal', C.grey)
    y = text(
      L(
        `«${qLabel(q)}». Razones anónimas. Quitamos automáticamente nombres, teléfonos, correos, números de identificación y detalles médicos. Si un grupo tiene menos de ${MIN_GROUP} personas, no mostramos sus razones.`,
        `"${qLabel(q)}". Anonymous reasons. We automatically remove names, phone numbers, emails, ID numbers and medical details. Groups under ${MIN_GROUP} people are not shown.`
      ),
      M,
      y + 1,
      CW,
      4.3
    )
    const col = (title: string, g: ReasonGroup, x: number, y0: number, w: number) => {
      font(8.5, 'bold', C.green)
      doc.text(safe(title.toUpperCase()), x, y0, { charSpace: 0.4 })
      let yy = y0 + 6
      if (g.hidden) {
        font(9.5, 'italic', C.grey)
        return text(
          L(`Grupo de ${g.groupSize} ${g.groupSize === 1 ? 'persona' : 'personas'}: menos de ${MIN_GROUP}, no mostramos razones para proteger el anonimato.`, `Group of ${g.groupSize}: under ${MIN_GROUP}, reasons hidden to protect anonymity.`),
          x,
          yy,
          w,
          4.4
        )
      }
      if (!g.reasons.length) {
        font(9.5, 'italic', C.grey)
        return text(L('Nadie de este grupo dejó una razón.', 'Nobody in this group left a reason.'), x, yy, w, 4.4)
      }
      for (const rr of g.reasons) {
        doc.setFillColor(...C.green)
        doc.rect(x, yy - 3.2, 0.9, 4, 'F')
        font(10, 'italic', C.ink)
        yy = text(`«${rr.text}»`, x + 3.5, yy, w - 4, 4.6)
        font(8, 'normal', C.grey)
        doc.text(L(`certeza ${rr.certainty}`, `certainty ${rr.certainty}`), x + 3.5, yy)
        yy += 6
      }
      return yy
    }
    const cw = (CW - 8) / 2
    const y1 = col(L(`Por qué dudan (sí tibio · ${q.reasons.doubt.groupSize})`, `Why they hesitate (tentative yes · ${q.reasons.doubt.groupSize})`), q.reasons.doubt, M, y + 8, cw)
    const y2 = col(L(`Por qué no (${q.reasons.no.groupSize})`, `Why not (${q.reasons.no.groupSize})`), q.reasons.no, M + cw + 8, y + 8, cw)
    y = Math.max(y1, y2) + 6
    font(8, 'normal', C.grey)
    text(L('Elegidas para representar los temas que más se repiten; no corregimos más que acentos y puntuación.', 'Chosen to represent the most repeated themes; only accents and punctuation corrected.'), M, y, CW, 3.8)
  })

  // ---------- 5. To talk about (questions, not advice) ----------
  newPage()
  eyebrow(L('Para conversar con su equipo', 'To discuss with your team'), M, 24)
  font(18, 'bold', C.ink)
  y = text(L('Preguntas que dejan los datos', 'Questions the data leaves open'), M, 36, CW, 7)
  font(9, 'normal', C.grey)
  y = text(L('No son recomendaciones: son preguntas que salen de los números para abrir la conversación.', 'These are not recommendations: they are questions raised by the numbers, to open the conversation.'), M, y + 1, CW, 4.3) + 4
  const talk: { t: string; b: string }[] = ordered.slice(0, 3).map((q) => ({
    t: L(`«${qLabel(q)}»`, `"${qLabel(q)}"`),
    b: L(
      `${q.stats.tentativeYesCount} personas dijeron que sí, pero sin firmeza. ¿Qué tendría que pasar para que ese «sí» sea firme la próxima vez?`,
      `${q.stats.tentativeYesCount} people said yes, but not firmly. What would have to happen for that yes to be firm next time?`
    ),
  }))
  talk.push({
    t: L('Volver a preguntar', 'Ask again'),
    b: L('Con la misma redacción, la siguiente lectura muestra si el «sí» firme sube o baja. Si cambian la pregunta, ya no se puede comparar.', 'With the same wording, the next reading shows whether firm yes goes up or down. If the wording changes, it can no longer be compared.'),
  })
  talk.forEach((tk, i) => {
    doc.setFillColor(...C.green)
    doc.circle(M + 4, y + 2, 4, 'F')
    font(10, 'bold', C.white)
    doc.text(String(i + 1), M + 4, y + 3.5, { align: 'center' })
    font(11, 'bold', C.ink)
    const yy = text(tk.t, M + 12, y + 3.5, CW - 12, 5)
    font(10, 'normal', C.ink)
    y = text(tk.b, M + 12, yy + 0.5, CW - 12, 4.8) + 6
  })

  // ---------- 6. Methodology ----------
  newPage()
  eyebrow(L('Notas para leer bien estos números', 'Notes for reading these numbers well'), M, 24)
  font(18, 'bold', C.ink)
  y = text(L('Cómo se hizo', 'How it was done'), M, 36, CW, 7) + 2
  const sample =
    r.sample.mode === 'all'
      ? L('toda la base de usuarios que nos indicaron', 'the whole user base provided')
      : L(`una muestra aleatoria de ${r.sample.n} personas, sorteada por Crowd Conscious el ${r.sample.drawnAt} de una base de ${r.sample.base}`, `a random sample of ${r.sample.n} people drawn by Crowd Conscious on ${r.sample.drawnAt} from a base of ${r.sample.base}`)
  const method = [
    [L('A quién preguntamos', 'Who we asked'), L(`A ${sample}. Cada invitación fue un enlace de un solo uso; Crowd Conscious no recibe nombres, correos ni teléfonos de quienes responden, solo identificadores anónimos.`, `${sample}. Each invitation was a single-use link; Crowd Conscious receives no names, emails or phone numbers from respondents, only anonymous IDs.`)],
    [L('Cuándo', 'When'), L(`La consulta estuvo abierta del ${r.fieldOpens} al ${r.fieldCloses}. Nadie, ni su organización, vio resultados antes del cierre.`, `Open from ${r.fieldOpens} to ${r.fieldCloses}. Nobody, including your organization, saw results before closing.`)],
    [L('Cómo se respondía', 'How people answered'), L(`Sí o no, más una certeza de 1 a 10. Firme = certeza ${FIRM_THRESHOLD} a 10. «Certeza de los "sí"» es el promedio de certeza solo de quienes dijeron que sí.`, `Yes or no, plus a certainty from 1 to 10. Firm = certainty ${FIRM_THRESHOLD} to 10. "Certainty of yes answers" is the mean certainty of yes answers only.`)],
    [L('Los porcentajes', 'Percentages'), L('Los cuatro grupos suman 100% de las respuestas de cada pregunta. «X% de los "sí", firmes» se calcula sobre los «sí» de esa pregunta.', 'The four groups add up to 100% of each question\'s answers. "X% of yes answers firm" is computed on that question\'s yes answers.')],
    [L('Tamaño', 'Size'), L(`Con menos de ${MIN_RESPONSES_FOR_HEADLINE} respuestas una pregunta se marca como «lectura preliminar». Razones de grupos con menos de ${MIN_GROUP} personas no se muestran.`, `Under ${MIN_RESPONSES_FOR_HEADLINE} responses a question is marked "preliminary". Reasons from groups under ${MIN_GROUP} people are not shown.`)],
    [L('Visibilidad y edición', 'Visibility and editing'), L(`La visibilidad (${r.visibility === 'public' ? 'pública' : 'privada'}) se decidió el ${r.visibilityLockedAt.slice(0, 10)}, antes de abrir la consulta, y no puede cambiar. Ni su organización ni Crowd Conscious editaron los resultados.`, `Visibility (${r.visibility}) was decided on ${r.visibilityLockedAt.slice(0, 10)}, before opening, and cannot change. Neither your organization nor Crowd Conscious edited the results.`)],
    [L('Lo que no es', 'What it is not'), L('Es una lectura de población cerrada: reportamos tasa de respuesta, no margen de error. Quien no responde puede pensar distinto.', 'A closed-population reading: we report response rate, not a margin of error. Non-respondents may think differently.')],
  ]
  doc.setFillColor(...C.dark)
  const mh = method.length * 15 + 10
  doc.rect(M, y, CW, mh, 'F')
  let my = y + 9
  for (const [t, b] of method) {
    font(9.5, 'bold', C.white)
    doc.text(safe(t), M + 6, my)
    font(9, 'normal', C.coverMuted)
    my = Math.max(text(b, M + 48, my, CW - 54, 4.2), my + 5) + 4
  }
  y = Math.max(my, y + mh) + 8
  font(11, 'bold', C.ink)
  doc.text(L('Las preguntas en números', 'The questions in numbers'), M, y)
  y += 6
  const cols = [L('Pregunta', 'Question'), L('Resp.', 'Resp.'), L('Sí', 'Yes'), L('Firmes de los «sí»', 'Firm of yes'), L('Certeza «sí»', 'Yes certainty'), L('No firme', 'Firm no')]
  const cx = [M, M + 82, M + 98, M + 112, M + 140, M + 162]
  font(8, 'bold', C.grey)
  cols.forEach((c, i) => doc.text(safe(c), cx[i], y))
  y += 2
  doc.setDrawColor(...C.rule)
  doc.line(M, y, W - M, y)
  y += 5
  for (const q of qs) {
    font(8.5, 'normal', C.ink)
    const qy = text(`${L('P', 'Q')}${num(q)}. ${qLabel(q)}`, cx[0], y, 78, 4)
    ;[String(q.stats.responses), pct(q.stats.pctYes), pct(q.stats.pctFirmOfYes), q.stats.yesCertainty.toFixed(1), pct(q.stats.split.firmNo)].forEach((v, i) =>
      doc.text(v, cx[i + 1], y)
    )
    y = qy + 2
    doc.line(M, y - 1, W - M, y - 1)
    y += 3
  }

  // ---------- 7. About (back cover) ----------
  newPage()
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, W, H, 'F')
  eyebrow(L('Sobre Crowd Conscious', 'About Crowd Conscious'), M, 70, C.greenLight)
  font(24, 'bold', C.white)
  y = text(L('Sepa qué tan seguros están sus usuarios.', 'Know how sure your users really are.'), M, 84, CW - 20, 10)
  font(11, 'normal', C.coverMuted)
  y = text(
    L(
      'Crowd Conscious es una plataforma mexicana para escuchar a las personas con su certeza de 1 a 10. Los resultados no los edita nadie y no pedimos datos personales a quienes responden. El 20% de cada contrato, antes de IVA, va al Fondo Consciente, que financia causas que la comunidad elige.',
      'Crowd Conscious is a Mexican platform for listening to people with their certainty from 1 to 10. Nobody edits the results and we ask respondents for no personal data. 20% of every contract, before VAT, goes to the Conscious Fund, which finances causes the community chooses.'
    ),
    M,
    y + 6,
    CW - 20,
    5.6
  )
  font(9.5, 'normal', C.coverMuted)
  y = text(
    L('Certificación Hecho en México · Fundador con Leaders in Innovation Fellowship de la Royal Academy of Engineering', 'Hecho en México certified · Founder holds a Royal Academy of Engineering Leaders in Innovation Fellowship'),
    M,
    y + 8,
    CW - 20,
    4.6
  )
  font(16, 'bold', C.greenLight)
  doc.text('crowdconscious.app/organizaciones', M, y + 16)
  font(9.5, 'normal', C.coverMuted)
  doc.text('francisco@crowdconscious.app', M, y + 23)
  if (o.demo) {
    font(9, 'bold', [252, 211, 77])
    doc.text(fict, M, H - 30)
  }

  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer)
}
