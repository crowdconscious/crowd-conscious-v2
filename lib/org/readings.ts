/**
 * Reading model shared by the client dashboard (/org/[slug]/lecturas/[id])
 * and the demo. toClientReading() is the ONLY way a reading leaves the
 * server: while a reading is not closed it carries counts and response rate
 * only, never per-question results (rule 5), in the UI and in any API.
 */
import { questionStats, type QuestionCounts, type QuestionStats } from './firmness'
import { reasonGroup, type Reason, type ReasonGroup } from './redact'

export type Locale = 'es' | 'en'
export type L = { es: string; en: string }

export type ReadingStatus = 'design' | 'field' | 'closed'

export type ReadingQuestion = {
  id: string
  /** Exact wording respondents saw (Spanish; en is a translation for display). */
  text: L
  /**
   * Short phrase naming who said yes, used in the headline, e.g.
   * es 'que recomendaría el hospital' -> «De su 91% que recomendaría el hospital, …».
   * Optional in the demo model: without it the headline quotes the question (phraseFor). Required (NOT NULL) in the DB.
   */
  headlinePhrase?: L
  counts: QuestionCounts
  reasons: { tentativeYes: Reason[]; no: Reason[] }
}

export type Reading = {
  id: string
  title: L
  period: L
  status: ReadingStatus
  visibility: 'private' | 'public'
  /** ISO timestamp the visibility decision was recorded, before field opened. */
  visibilityLockedAt: string
  fieldOpens: string
  fieldCloses: string
  /** Only for readings in field. */
  closesInDays?: number
  invited: number
  responded: number
  sample: { mode: 'all' } | { mode: 'random'; n: number; base: number; drawnAt: string }
  product: 'pilot' | 'annual' | 'continuous'
  questions: ReadingQuestion[]
}

/**
 * What leaves the server for a closed reading: raw reasons are replaced by
 * redacted, size-gated groups (rule 8), so unredacted text never reaches
 * the browser.
 */
export type ClientQuestion = Omit<ReadingQuestion, 'reasons'> & {
  stats: QuestionStats
  reasons: { doubt: ReasonGroup; no: ReasonGroup }
}

export type ClientReading = Omit<Reading, 'questions'> & {
  /** Empty unless status === 'closed'. */
  questions: ClientQuestion[]
}

export function toClientReading(r: Reading): ClientReading {
  if (r.status !== 'closed') {
    return { ...r, questions: [] }
  }
  return {
    ...r,
    questions: r.questions.map((q) => {
      const stats = questionStats(q.counts)
      return {
        id: q.id,
        text: q.text,
        ...(q.headlinePhrase ? { headlinePhrase: q.headlinePhrase } : {}),
        counts: q.counts,
        stats,
        reasons: {
          doubt: reasonGroup(stats.tentativeYesCount, q.reasons.tentativeYes),
          no: reasonGroup(stats.noCount, q.reasons.no),
        },
      }
    }),
  }
}

/** Response rate is only meaningful when the client declared how many people got the link. */
export function hasInvited(r: Pick<Reading, 'invited'>) {
  return r.invited > 0
}

/** Count tiles: invited/responses/rate, or just responses when invited is unknown (0). */
export function countTiles(r: Pick<Reading, 'invited' | 'responded'>, l: { invited: string; responded: string; rate: string }, nf: (n: number) => string = String): [string, string][] {
  return hasInvited(r) ? [[l.invited, nf(r.invited)], [l.responded, nf(r.responded)], [l.rate, `${responseRate(r)}%`]] : [[l.responded, nf(r.responded)]]
}

export function responseRate(r: Pick<Reading, 'invited' | 'responded'>) {
  return r.invited > 0 ? Math.round((r.responded / r.invited) * 1000) / 10 : 0
}

export type Trend =
  | { kind: 'none' }
  | { kind: 'modified'; prevPeriod: L }
  | { kind: 'delta'; prevPeriod: L; dYes: number; dFirmYes: number }

/**
 * Compare with the most recent earlier closed reading. Only an exact match of
 * the question wording is comparable; otherwise "pregunta modificada".
 */
export function questionTrend(q: ClientQuestion, index: number, earlier: ClientReading | null): Trend {
  if (!earlier || earlier.status !== 'closed') return { kind: 'none' }
  const same = earlier.questions.find((p) => p.text.es === q.text.es)
  if (same) {
    return {
      kind: 'delta',
      prevPeriod: earlier.period,
      dYes: q.stats.pctYes - same.stats.pctYes,
      dFirmYes: q.stats.split.firmYes - same.stats.split.firmYes,
    }
  }
  return earlier.questions[index] ? { kind: 'modified', prevPeriod: earlier.period } : { kind: 'none' }
}
