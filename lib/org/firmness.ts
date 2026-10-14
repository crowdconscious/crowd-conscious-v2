/**
 * Single source of truth for "firme" and the reading math shared by the
 * dashboard, the demo, the Resumen para direccion, the PDF and (later) the
 * Sello. Never redefine these thresholds anywhere else.
 *
 * Decisions pending Francisco (defaults proposed in the UX pack):
 *   FIRM_THRESHOLD = 8  -> "firme" means certainty 8-10
 *   MIN_GROUP      = 10 -> reasons hidden for groups smaller than this
 */
export const FIRM_THRESHOLD = 8
export const MIN_GROUP = 10
/** Below this many responses a question gets "Lectura preliminar". */
export const MIN_RESPONSES_FOR_HEADLINE = 30
export const CERTAINTY_MIN = 1
export const CERTAINTY_MAX = 10

/** Counts per certainty value; index 0 = certainty 1 ... index 9 = certainty 10. */
export type Histogram = number[]

export type QuestionCounts = { yes: Histogram; no: Histogram }

export type Split = {
  firmYes: number
  tentativeYes: number
  tentativeNo: number
  firmNo: number
}

export const isFirm = (certainty: number) => certainty >= FIRM_THRESHOLD

const sum = (h: Histogram) => h.reduce((a, b) => a + b, 0)
const firmCount = (h: Histogram) => h.reduce((a, v, i) => (isFirm(i + 1) ? a + v : a), 0)

export function assertHistogram(h: Histogram) {
  if (h.length !== CERTAINTY_MAX) throw new Error('histogram must have 10 buckets')
  if (h.some((v) => !Number.isInteger(v) || v < 0)) throw new Error('histogram counts must be non-negative integers')
}

/**
 * Integer percentages that always add up to exactly 100 (largest remainder).
 * Returns all zeros when there are no responses.
 */
export function percentagesSummingTo100(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return counts.map(() => 0)
  const raw = counts.map((c) => (c / total) * 100)
  const floors = raw.map(Math.floor)
  let remainder = 100 - floors.reduce((a, b) => a + b, 0)
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const { i } of order) {
    if (remainder <= 0) break
    floors[i] += 1
    remainder -= 1
  }
  return floors
}

export type QuestionStats = {
  responses: number
  yesCount: number
  noCount: number
  /** % of all responses that said yes (integer). */
  pctYes: number
  /** % of the yes answers given with firm certainty (integer). */
  pctFirmOfYes: number
  /** Four segments over all responses, integers summing to 100. */
  split: Split
  /** Mean certainty (1-10) among the «sí» answers only. */
  yesCertainty: number
  tentativeYesCount: number
  preliminary: boolean
}

export function questionStats(c: QuestionCounts): QuestionStats {
  assertHistogram(c.yes)
  assertHistogram(c.no)
  const yesCount = sum(c.yes)
  const noCount = sum(c.no)
  const responses = yesCount + noCount
  const firmYes = firmCount(c.yes)
  const firmNo = firmCount(c.no)
  const [fy, ty, tn, fn] = percentagesSummingTo100([firmYes, yesCount - firmYes, noCount - firmNo, firmNo])
  const yesWeighted = c.yes.reduce((a, v, i) => a + v * (i + 1), 0)
  return {
    responses,
    yesCount,
    noCount,
    pctYes: responses ? Math.round((yesCount / responses) * 100) : 0,
    pctFirmOfYes: yesCount ? Math.round((firmYes / yesCount) * 100) : 0,
    split: { firmYes: fy, tentativeYes: ty, tentativeNo: tn, firmNo: fn },
    yesCertainty: yesCount ? Math.round((yesWeighted / yesCount) * 10) / 10 : 0,
    tentativeYesCount: yesCount - firmYes,
    preliminary: responses < MIN_RESPONSES_FOR_HEADLINE,
  }
}

export type HeadlineInput = { text: string; stats: QuestionStats }

export type Headline =
  | { kind: 'preliminary' }
  | {
      kind: 'answer'
      pctYes: number
      pctFirmOfYes: number
      weakest: { text: string; pctFirmOfYes: number } | null
    }

/**
 * Facts only, computed from the data. The lead question (index 0) drives the
 * sentence; "donde mas dudan" is the question with the lowest firm share of its «sí» (same base as line one).
 */
export function computeHeadline(questions: HeadlineInput[]): Headline | null {
  if (!questions.length) return null
  if (questions.some((q) => q.stats.preliminary)) return { kind: 'preliminary' }
  const lead = questions[0].stats
  const weakest = questions.length > 1 ? [...questions].sort((a, b) => a.stats.pctFirmOfYes - b.stats.pctFirmOfYes)[0] : null
  return {
    kind: 'answer',
    pctYes: lead.pctYes,
    pctFirmOfYes: lead.pctFirmOfYes,
    weakest: weakest ? { text: weakest.text, pctFirmOfYes: weakest.stats.pctFirmOfYes } : null,
  }
}

/** Questions ordered by firm share of «sí», lowest first (same base as the headline). */
export function orderByFirmYes<T extends { stats: QuestionStats }>(qs: T[]): T[] {
  return [...qs].sort((a, b) => a.stats.pctFirmOfYes - b.stats.pctFirmOfYes)
}
