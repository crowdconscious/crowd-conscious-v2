/**
 * CSV downloads for a closed reading. Neither file carries IDs, timestamps
 * or anything that identifies a respondent.
 *  - aggregateCsv: counts per question × answer × certainty, plus the summary.
 *  - answersCsv: one row per (anonymous) answer, shuffled, reasons redacted.
 *    Suppressed entirely for readings under MIN_RESPONSES_FOR_HEADLINE.
 *    Within a question, the rows of any segment (firm/tentative yes/no) with
 *    fewer than MIN_GROUP people are left out, and the file says so.
 */
import { randomInt } from 'node:crypto'
import { MIN_GROUP, MIN_RESPONSES_FOR_HEADLINE, segmentFor, type SegmentKey } from './firmness'
import { redactReason } from './redact'
import type { ClientReading } from './readings'

type Loc = 'es' | 'en'
const BOM = '\uFEFF'
const cell = (v: string | number) => {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const row = (cells: (string | number)[]) => cells.map(cell).join(',')

const SEG_LABEL: Record<SegmentKey, { es: string; en: string }> = {
  firmYes: { es: 'sí firme', en: 'firm yes' },
  tentativeYes: { es: 'sí tibio', en: 'tentative yes' },
  tentativeNo: { es: 'no tibio', en: 'tentative no' },
  firmNo: { es: 'no firme', en: 'firm no' },
}

export function aggregateCsv(r: ClientReading, locale: Loc): string {
  const es = locale === 'es'
  const out: string[] = []
  out.push(row(es
    ? ['pregunta_num', 'pregunta', 'respuestas', 'pct_si', 'pct_firmes_de_los_si', 'certeza_de_los_si', 'pct_si_firme', 'pct_si_tibio', 'pct_no_tibio', 'pct_no_firme']
    : ['question_num', 'question', 'responses', 'pct_yes', 'pct_firm_of_yes', 'yes_certainty', 'pct_firm_yes', 'pct_tentative_yes', 'pct_tentative_no', 'pct_firm_no']))
  r.questions.forEach((q, i) => {
    const s = q.stats
    out.push(row([i + 1, q.text[locale], s.responses, s.pctYes, s.pctFirmOfYes, s.yesCertainty.toFixed(1), s.split.firmYes, s.split.tentativeYes, s.split.tentativeNo, s.split.firmNo]))
  })
  out.push('')
  out.push(row(es ? ['pregunta_num', 'respuesta', 'certeza', 'personas'] : ['question_num', 'answer', 'certainty', 'people']))
  r.questions.forEach((q, i) => {
    for (const [k, h] of [['yes', q.counts.yes], ['no', q.counts.no]] as const)
      h.forEach((n, c) => out.push(row([i + 1, k === 'yes' ? (es ? 'sí' : 'yes') : 'no', c + 1, n])))
  })
  return BOM + out.join('\r\n') + '\r\n'
}

export type RawAnswer = { questionId: string; answer: boolean; certainty: number; reason: string | null }

export type AnswersCsv = { ok: true; csv: string; suppressedSegments: number } | { ok: false; reason: 'too_few_responses' | 'not_closed' }

function shuffle<T>(a: T[]): T[] {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

export function answersCsv(r: ClientReading, answers: RawAnswer[], locale: Loc): AnswersCsv {
  if (r.status !== 'closed') return { ok: false, reason: 'not_closed' }
  if (r.responded < MIN_RESPONSES_FOR_HEADLINE) return { ok: false, reason: 'too_few_responses' }
  const es = locale === 'es'
  const qIndex = new Map(r.questions.map((q, i) => [q.id, i]))
  // Segment sizes per question, from the answers themselves.
  const size = new Map<string, number>()
  const key = (a: RawAnswer) => `${a.questionId}:${segmentFor(a.answer ? 'yes' : 'no', a.certainty)}`
  for (const a of answers) size.set(key(a), (size.get(key(a)) ?? 0) + 1)
  const suppressed = new Set([...size].filter(([, n]) => n < MIN_GROUP).map(([k]) => k))
  const rows = shuffle(answers.filter((a) => qIndex.has(a.questionId) && !suppressed.has(key(a))))
  // Sort only by question so rows of one person are not adjacent/linkable.
  rows.sort((a, b) => qIndex.get(a.questionId)! - qIndex.get(b.questionId)!)
  const out = [row(es ? ['pregunta_num', 'pregunta', 'respuesta', 'certeza', 'grupo', 'razon'] : ['question_num', 'question', 'answer', 'certainty', 'group', 'reason'])]
  for (const a of rows) {
    const i = qIndex.get(a.questionId)!
    const seg = segmentFor(a.answer ? 'yes' : 'no', a.certainty)
    out.push(row([i + 1, r.questions[i].text[locale], a.answer ? (es ? 'sí' : 'yes') : 'no', a.certainty, SEG_LABEL[seg][locale], a.reason ? redactReason(a.reason) : '']))
  }
  if (suppressed.size)
    out.push('', row([es
      ? `Nota: se omitieron ${suppressed.size} grupo(s) con menos de ${MIN_GROUP} personas para proteger el anonimato.`
      : `Note: ${suppressed.size} group(s) under ${MIN_GROUP} people were omitted to protect anonymity.`]))
  return { ok: true, csv: BOM + out.join('\r\n') + '\r\n', suppressedSegments: suppressed.size }
}
