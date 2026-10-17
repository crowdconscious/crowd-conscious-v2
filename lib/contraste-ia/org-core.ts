/**
 * Contraste IA for org readings — pure helpers (no I/O). Covered by org-core.test.ts.
 *
 * Each persona answers the WHOLE yes/no survey in one call (as a respondent
 * would), so a reading costs n_runs × n_personas calls regardless of how many
 * questions it has. Results are locked per question in `org_ai_predictions`
 * (migration 291) before the field opens and are shown ONLY to the client,
 * after the field closes. Respondents never see them.
 */
import { CONFIDENCE_KEYS } from './core'

export const ORG_PROMPT_VERSION = 'contraste-ia-org-v1'

export type OrgSubject = {
  orgName: string
  title: string
  locale: 'es' | 'en'
  /** Exactly what respondents read, in the survey's language, in order. */
  questions: { id: string; position: number; text: string }[]
}

export type OrgPanelAnswer = { yes: boolean; certainty: number }

/** Client-safe locked prediction for one question (attached to ReadingQuestion). */
export type QuestionContraste = {
  /** Mean share of personas answering yes, 0..1. */
  aiYes: number
  /** Run-to-run std-dev of that share, 0..1. */
  spread: number
  avgCertainty: number | null
  model: string
  nRuns: number
  nPersonas: number
  status: 'locked' | 'late'
  lockedAt: string
  firstResponseAt: string | null
  /** Question wording changed after the lock. */
  stale: boolean
}

function djb2(canon: string) {
  let h1 = 5381
  let h2 = 52711
  for (let i = 0; i < canon.length; i++) {
    const c = canon.charCodeAt(i)
    h1 = (h1 * 33) ^ c
    h2 = (h2 * 33) ^ c
  }
  return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`
}

/** Hash of one question's wording (+ survey title/locale): a new wording gets a new lock. */
export function questionHash(s: Pick<OrgSubject, 'title' | 'locale'>, text: string): string {
  return djb2(JSON.stringify([s.locale, s.title.trim(), text.trim()]))
}

/** The persona prompt: the survey as a respondent sees it, plus the answer format. */
export function buildOrgUserPrompt(s: OrgSubject): string {
  const lines = s.questions.map((q, i) => `${i + 1}. ${q.text.trim()}`).join('\n')
  return (
    `${s.orgName ? `${s.orgName} te pide responder una consulta breve` : 'Te piden responder una consulta breve'}: «${s.title.trim()}».\n` +
    `Cada pregunta se contesta con «sí» o «no» y qué tan seguro/a estás (1-10).\n\n${lines}\n\n` +
    `En lugar del formato anterior, responde EXCLUSIVAMENTE con JSON válido, una entrada por pregunta y en el mismo orden:\n` +
    `{"answers": [{"q": 1, "answer": "si" | "no", "confidence": <1-10>}, ...]}`
  )
}

function stripFences(raw: string): string {
  const t = raw.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return m ? m[1] : t
}

/** Parse one persona's survey answers. All-or-nothing: null unless every question is answered validly. */
export function parseOrgAnswers(raw: string, n: number): OrgPanelAnswer[] | null {
  let obj: unknown
  try {
    obj = JSON.parse(stripFences(raw))
  } catch {
    return null
  }
  const arr = obj && typeof obj === 'object' ? (obj as { answers?: unknown }).answers : null
  if (!Array.isArray(arr)) return null
  const out: (OrgPanelAnswer | null)[] = Array(n).fill(null)
  for (const [i, a] of arr.entries()) {
    if (!a || typeof a !== 'object') return null
    const o = a as Record<string, unknown>
    const q = typeof o.q === 'number' ? o.q : i + 1
    if (!Number.isInteger(q) || q < 1 || q > n || out[q - 1]) return null
    const ans = typeof o.answer === 'string' ? o.answer.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : o.answer
    const yes = ans === 'si' || ans === 'yes' || ans === true ? true : ans === 'no' || ans === false ? false : null
    const c = o.confidence ?? o.certainty
    if (yes === null || typeof c !== 'number' || !Number.isInteger(c) || c < 1 || c > 10) return null
    out[q - 1] = { yes, certainty: c }
  }
  return out.every(Boolean) ? (out as OrgPanelAnswer[]) : null
}

const round4 = (x: number) => Math.round(x * 10000) / 10000
const emptyHist = () => Object.fromEntries(CONFIDENCE_KEYS.map((k) => [k, 0])) as Record<string, number>

/**
 * `runs[r]` = every valid persona answer sheet of run r. Returns, per question
 * index, the mean yes share across runs, its std-dev, and certainty histograms.
 */
export function aggregateOrgRuns(runs: readonly (readonly OrgPanelAnswer[])[][], nQuestions: number) {
  const ok = runs.filter((r) => r.length > 0)
  return Array.from({ length: nQuestions }, (_, qi) => {
    const shares = ok.map((r) => r.filter((sheet) => sheet[qi].yes).length / r.length)
    const mean = shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : 0
    const variance = shares.length > 1 ? shares.reduce((a, b) => a + (b - mean) ** 2, 0) / (shares.length - 1) : 0
    const yes_certainty = emptyHist()
    const no_certainty = emptyHist()
    let s = 0
    let n = 0
    for (const r of ok)
      for (const sheet of r) {
        const a = sheet[qi]
        ;(a.yes ? yes_certainty : no_certainty)[String(a.certainty)] += 1
        s += a.certainty
        n += 1
      }
    return {
      yes_share: round4(mean),
      yes_spread: round4(Math.sqrt(variance)),
      runs: shares.map((x, i) => ({ run: i + 1, yes_share: round4(x), valid: ok[i].length })),
      yes_certainty,
      no_certainty,
      avg_certainty: n ? Math.round((s / n) * 100) / 100 : null,
    }
  })
}

/** Gap in points: people's % yes minus the AI's % yes. */
export function orgGap(aiYes: number, humanPctYes: number): number {
  return Math.round(humanPctYes - aiYes * 100)
}

/** Plain-language line for one question. */
export function orgGapLine(aiYes: number, humanPctYes: number, locale: 'es' | 'en'): string {
  const ai = Math.round(aiYes * 100)
  const g = orgGap(aiYes, humanPctYes)
  if (locale === 'en') {
    if (Math.abs(g) < 5) return `The AI expected ${ai}% yes; your people said ${humanPctYes}%. The general intuition holds here.`
    return `The AI expected ${ai}% yes; your people said ${humanPctYes}%: ${Math.abs(g)} points ${g > 0 ? 'more' : 'less'} than expected.`
  }
  if (Math.abs(g) < 5) return `La IA esperaba ${ai}% de «sí»; su gente dijo ${humanPctYes}%. Aquí la intuición general se cumple.`
  return `La IA esperaba ${ai}% de «sí»; su gente dijo ${humanPctYes}%: ${Math.abs(g)} puntos ${g > 0 ? 'más' : 'menos'} de lo esperado.`
}

/** Explainer shown with every Contraste IA block (web + PDF). */
export const ORG_EXPLAINER = {
  es: {
    title: 'Contraste IA: qué es y por qué importa',
    body:
      'Antes de abrir la consulta, 3 paneles de 50 personas sintéticas de la CDMX (IA) leyeron exactamente las mismas preguntas y respondieron sí o no. ' +
      'Esa predicción quedó guardada y bloqueada antes de la primera respuesta real; nadie que respondió la vio. ' +
      'La IA representa lo que «se esperaría» de un público general. Donde su gente se aleja de esa expectativa está lo que una encuesta genérica o un modelo no le habría dicho. ' +
      'Una brecha grande es un hallazgo, no un error. Una brecha pequeña confirma que la intuición general aplica a su organización.',
  },
  en: {
    title: 'AI Contrast: what it is and why it matters',
    body:
      'Before the survey opened, 3 panels of 50 synthetic Mexico City personas (AI) read exactly the same questions and answered yes or no. ' +
      'That prediction was stored and locked before the first real response; no respondent ever saw it. ' +
      'The AI stands for what a general public "would be expected" to say. Where your people differ from it is what a generic survey or a model would not have told you. ' +
      'A large gap is a finding, not an error. A small gap confirms the general intuition applies to your organisation.',
  },
} as const

/** Small-print provenance line. */
export function orgProvenance(c: QuestionContraste, locale: 'es' | 'en', fmt: (iso: string) => string): string {
  const spread = Math.round(c.spread * 100)
  if (locale === 'en') {
    return (
      (c.status === 'locked' ? `Locked ${fmt(c.lockedAt)}, before the first response. ` : `Recorded ${fmt(c.lockedAt)}, after responses had started (marked late). `) +
      `${c.nRuns} runs × ${c.nPersonas} personas · run-to-run spread ±${spread} pts · model ${c.model}. Cannot be edited.` +
      (c.stale ? ' Note: the question wording changed after this prediction.' : '')
    )
  }
  return (
    (c.status === 'locked' ? `Bloqueada el ${fmt(c.lockedAt)}, antes de la primera respuesta. ` : `Registrada el ${fmt(c.lockedAt)}, cuando ya había respuestas (marcada como tardía). `) +
    `${c.nRuns} corridas × ${c.nPersonas} personas · variación entre corridas ±${spread} pts · modelo ${c.model}. No se puede editar.` +
    (c.stale ? ' Nota: la redacción de la pregunta cambió después de esta predicción.' : '')
  )
}

export function fmtLockedAt(iso: string, locale: 'es' | 'en'): string {
  const s = new Date(iso).toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'America/Mexico_City',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${s} (${locale === 'es' ? 'hora CDMX' : 'Mexico City time'})`
}
