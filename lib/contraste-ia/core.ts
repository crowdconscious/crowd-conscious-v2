/**
 * Contraste IA — pure helpers (no I/O). Covered by core.test.ts.
 *
 * A Contraste IA prediction is a persona panel (same personas + prompt style as
 * Pulse Simulation) run synchronously N times BEFORE real votes, aggregated and
 * locked in `pulse_ai_predictions` (migration 289). It only ever sees what a
 * voter sees before voting: question, description, options.
 */

export const CONTRASTE_PROMPT_VERSION = 'contraste-ia-v1'
export const DEFAULT_RUNS = 3
export const MAX_RUNS = 5
export const CONFIDENCE_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const

export type Subject = {
  question: string
  description: string | null
  options: string[]
  voteMode: 'single' | 'multi'
  maxSelections: number
}

export type PanelVote = { options: string[]; confidence: number }

export type RunResult = {
  run: number
  option_distribution: Record<string, number>
  confidence_distribution: Record<string, number>
  valid: number
  attempted: number
  input_tokens: number
  output_tokens: number
}

/** Stable hash of the pre-vote subject (djb2 over a canonical JSON). */
export function subjectHash(s: Subject): string {
  const canon = JSON.stringify([
    s.question.trim(),
    (s.description ?? '').trim(),
    s.options.map((o) => o.trim()),
    s.voteMode,
    s.voteMode === 'multi' ? s.maxSelections : 1,
  ])
  let h1 = 5381
  let h2 = 52711
  for (let i = 0; i < canon.length; i++) {
    const c = canon.charCodeAt(i)
    h1 = (h1 * 33) ^ c
    h2 = (h2 * 33) ^ c
  }
  return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`
}

/** Extra instruction appended to the persona user prompt for multi-select Pulses. */
export function multiInstruction(maxSelections: number): string {
  return (
    `Esta consulta permite elegir de 1 a ${maxSelections} opciones. ` +
    `En lugar del formato anterior, responde EXCLUSIVAMENTE con JSON válido:\n` +
    `{"options": ["<texto exacto>", ...], "confidence": <1-10>, "reasoning_es": "<una frase>"}`
  )
}

function stripFences(raw: string): string {
  const t = raw.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return m ? m[1] : t
}

/** Parse one persona answer. Accepts {option} or {options:[...]}. */
export function parsePanelVote(
  raw: string,
  allowed: readonly string[],
  maxSelections: number,
): PanelVote | null {
  let obj: unknown
  try {
    obj = JSON.parse(stripFences(raw))
  } catch {
    return null
  }
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const picks = Array.isArray(o.options)
    ? o.options
    : typeof o.option === 'string'
      ? [o.option]
      : []
  const set = new Set(allowed)
  const uniq = [...new Set(picks.filter((p): p is string => typeof p === 'string' && set.has(p)))]
  if (uniq.length === 0 || uniq.length > Math.max(1, maxSelections)) return null
  const c = o.confidence
  if (typeof c !== 'number' || !Number.isInteger(c) || c < 1 || c > 10) return null
  return { options: uniq, confidence: c }
}

/** Share of personas choosing each option (sums to 1 for single, ≥1 for multi). */
export function summarizeRun(votes: readonly PanelVote[], options: readonly string[]) {
  const option_distribution: Record<string, number> = {}
  const confidence_distribution: Record<string, number> = {}
  for (const k of CONFIDENCE_KEYS) confidence_distribution[k] = 0
  for (const opt of options) option_distribution[opt] = 0
  for (const v of votes) {
    for (const p of v.options) option_distribution[p] = (option_distribution[p] ?? 0) + 1
    confidence_distribution[String(v.confidence)] += 1
  }
  const n = votes.length
  for (const opt of options) option_distribution[opt] = n > 0 ? option_distribution[opt] / n : 0
  return { option_distribution, confidence_distribution }
}

/** Mean + std-dev across runs per option; summed certainty histogram. */
export function aggregateRuns(runs: readonly RunResult[], options: readonly string[]) {
  const ok = runs.filter((r) => r.valid > 0)
  const option_distribution: Record<string, number> = {}
  const option_spread: Record<string, number> = {}
  for (const opt of options) {
    const xs = ok.map((r) => r.option_distribution[opt] ?? 0)
    const mean = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
    const variance = xs.length > 1 ? xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1) : 0
    option_distribution[opt] = round4(mean)
    option_spread[opt] = round4(Math.sqrt(variance))
  }
  const confidence_distribution: Record<string, number> = {}
  let sum = 0
  let n = 0
  for (const k of CONFIDENCE_KEYS) {
    const c = ok.reduce((a, r) => a + (r.confidence_distribution[k] ?? 0), 0)
    confidence_distribution[k] = c
    sum += c * Number(k)
    n += c
  }
  return {
    option_distribution,
    option_spread,
    confidence_distribution,
    avg_confidence: n > 0 ? Math.round((sum / n) * 100) / 100 : null,
  }
}

function round4(x: number) {
  return Math.round(x * 10000) / 10000
}

/** Interleave a stratum-sorted pool into `k` disjoint, demographically balanced panels. */
export function splitPanels<T>(sortedPool: readonly T[], k: number, perRun: number): T[][] {
  const panels: T[][] = Array.from({ length: k }, () => [])
  sortedPool.forEach((p, i) => {
    const panel = panels[i % k]
    if (panel.length < perRun) panel.push(p)
  })
  return panels
}

export type Comparison = {
  rows: { option: string; ai: number; human: number; gap: number }[]
  /** Option with the largest |gap| (percentage points). */
  biggest: { option: string; gap: number } | null
  /** Mean absolute gap across options, in percentage points. */
  meanAbsGapPts: number
  aiTop: string | null
  humanTop: string | null
}

/** AI vs human, both as "% of people choosing the option". Values in 0..1, gaps in points. */
export function compare(
  options: readonly string[],
  ai: Record<string, number>,
  human: Record<string, number>,
): Comparison {
  const rows = options.map((option) => {
    const a = ai[option] ?? 0
    const h = human[option] ?? 0
    return { option, ai: a, human: h, gap: Math.round((h - a) * 1000) / 10 }
  })
  let biggest: Comparison['biggest'] = null
  for (const r of rows) if (!biggest || Math.abs(r.gap) > Math.abs(biggest.gap)) biggest = { option: r.option, gap: r.gap }
  const top = (k: 'ai' | 'human') =>
    rows.length ? rows.reduce((b, r) => (r[k] > b[k] ? r : b)).option : null
  const meanAbsGapPts = rows.length
    ? Math.round((rows.reduce((a, r) => a + Math.abs(r.gap), 0) / rows.length) * 10) / 10
    : 0
  return { rows, biggest, meanAbsGapPts, aiTop: top('ai'), humanTop: top('human') }
}

/** Plain-language gap headline (Spanish). */
export function gapHeadline(c: Comparison): string {
  if (!c.biggest || c.rows.length === 0) return ''
  const pts = Math.abs(c.biggest.gap).toFixed(0)
  if (c.aiTop && c.humanTop && c.aiTop !== c.humanTop) {
    return `La IA esperaba que ganara «${c.aiTop}», pero la gente eligió «${c.humanTop}».`
  }
  if (Math.abs(c.biggest.gap) < 5) {
    return `La IA acertó: ninguna opción se alejó más de ${Math.max(1, Number(pts))} puntos de lo que dijo la gente.`
  }
  const dir = c.biggest.gap > 0 ? 'más' : 'menos'
  return `La gente apoyó «${c.biggest.option}» ${pts} puntos ${dir} de lo que la IA esperaba.`
}

/** Haiku list price, synchronous calls (no batch discount). USD per token. */
export function costUsd(inputTokens: number, outputTokens: number): number {
  return Math.round((inputTokens / 1e6 + (outputTokens * 5) / 1e6) * 100000) / 100000
}
