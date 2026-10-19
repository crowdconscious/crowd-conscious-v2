/**
 * Contraste IA — server orchestration (service role only).
 *
 *  ensurePredictionLocked(): run the persona panel N times synchronously (Haiku,
 *  Messages API, not batch, so it finishes in seconds) and insert ONE immutable
 *  row into pulse_ai_predictions. The DB trigger stamps locked_at and marks the
 *  row 'late' if any vote already exists. Input is strictly pre-vote: the
 *  question, description and options. Real votes are never read here.
 *
 *  loadContraste(): prediction + human side for the results page / reports.
 *  Callers enforce visibility (see lib/contraste-ia/visibility.ts).
 */
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MODELS, getAnthropicClient } from '@/lib/agents/config'
import { buildAgentUserPrompt, renderAgentSystemPrompt } from '@/lib/simulation/prompts'
import { personaStratumKey } from '@/lib/simulation/run'
import {
  CONTRASTE_PROMPT_VERSION,
  DEFAULT_RUNS,
  MAX_RUNS,
  aggregateRuns,
  compare,
  costUsd,
  multiInstruction,
  parsePanelVote,
  splitPanels,
  subjectHash,
  summarizeRun,
  type Comparison,
  type PanelVote,
  type RunResult,
  type Subject,
} from './core'

const PERSONA_VERSION = 'cdmx-v1'
const PER_RUN = Number(process.env.CONTRASTE_IA_PERSONAS_PER_RUN) || 50
const CONCURRENCY = 15
const MAX_TOKENS = 200

export function configuredRuns(): number {
  const n = Number(process.env.CONTRASTE_IA_RUNS)
  return Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_RUNS) : DEFAULT_RUNS
}

type TriggerSource = 'publish' | 'backstop' | 'draft' | 'manual'

export async function readSubject(admin: SupabaseClient, marketId: string): Promise<Subject> {
  const { data: m, error } = await admin
    .from('prediction_markets')
    .select('title, description, vote_mode, max_selections')
    .eq('id', marketId)
    .single()
  if (error || !m) throw new Error(`contraste: market ${marketId} not found`)
  const { data: outs } = await admin
    .from('market_outcomes')
    .select('label, sort_order')
    .eq('market_id', marketId)
    .order('sort_order', { ascending: true })
  const options = (outs ?? []).map((o: { label: string }) => o.label).filter(Boolean)
  if (options.length < 2) throw new Error(`contraste: market ${marketId} has < 2 options`)
  const voteMode = m.vote_mode === 'multi' ? 'multi' : 'single'
  return {
    question: m.title,
    description: m.description ?? null,
    options,
    voteMode,
    maxSelections: voteMode === 'multi' ? Number(m.max_selections) || 3 : 1,
  }
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

export type LockResult =
  | { ok: true; skipped: true; reason: 'exists' }
  | { ok: true; skipped: false; id: string; status: 'locked' | 'late'; locked_at: string; cost_usd: number; model_calls: number }
  | { ok: false; error: string }

/**
 * Idempotent: if a prediction for the current wording already exists, does nothing.
 * Never throws; returns { ok:false } so publish can continue.
 */
export async function ensurePredictionLocked(
  admin: SupabaseClient,
  marketId: string,
  source: TriggerSource,
): Promise<LockResult> {
  try {
    const subject = await readSubject(admin, marketId)
    const hash = subjectHash(subject)
    const { data: existing } = await admin
      .from('pulse_ai_predictions')
      .select('id')
      .eq('market_id', marketId)
      .eq('subject_hash', hash)
      .maybeSingle()
    if (existing) return { ok: true, skipped: true, reason: 'exists' }

    const { data: personas, error: pErr } = await admin
      .from('simulation_personas')
      .select('*')
      .eq('version', PERSONA_VERSION)
    if (pErr || !personas?.length) throw new Error(`no personas for ${PERSONA_VERSION}`)
    const sorted = [...personas].sort((a, b) => {
      const ka = personaStratumKey(a) + a.id
      const kb = personaStratumKey(b) + b.id
      return ka < kb ? -1 : ka > kb ? 1 : 0
    })
    const nRuns = configuredRuns()
    const panels = splitPanels(sorted, nRuns, PER_RUN)

    let userPrompt = buildAgentUserPrompt(subject)
    if (subject.voteMode === 'multi') userPrompt += `\n\n${multiInstruction(subject.maxSelections)}`

    const client = getAnthropicClient()
    const model = MODELS.FAST
    const jobs = panels.flatMap((panel, run) => panel.map((persona) => ({ run, persona })))
    const answers = await pool(jobs, CONCURRENCY, async ({ run, persona }) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const msg = await client.messages.create({
            model,
            max_tokens: MAX_TOKENS,
            temperature: 1,
            system: renderAgentSystemPrompt(persona),
            messages: [{ role: 'user', content: userPrompt }],
          })
          const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
          const vote = parsePanelVote(text, subject.options, subject.maxSelections)
          const usage = { in: msg.usage?.input_tokens ?? 0, out: msg.usage?.output_tokens ?? 0 }
          if (vote || attempt === 1) return { run, vote, usage, calls: attempt + 1 }
        } catch (err) {
          if (attempt === 1) return { run, vote: null, usage: { in: 0, out: 0 }, calls: 2, err }
        }
      }
      return { run, vote: null, usage: { in: 0, out: 0 }, calls: 2 }
    })

    const runs: RunResult[] = panels.map((panel, run) => {
      const mine = answers.filter((a) => a.run === run)
      const votes = mine.map((a) => a.vote).filter((v): v is PanelVote => !!v)
      return {
        run: run + 1,
        ...summarizeRun(votes, subject.options),
        valid: votes.length,
        attempted: panel.length,
        input_tokens: mine.reduce((s, a) => s + a.usage.in, 0),
        output_tokens: mine.reduce((s, a) => s + a.usage.out, 0),
      }
    })
    const valid = runs.reduce((s, r) => s + r.valid, 0)
    const attempted = runs.reduce((s, r) => s + r.attempted, 0)
    if (valid < attempted * 0.6) throw new Error(`only ${valid}/${attempted} valid panel answers`)

    const agg = aggregateRuns(runs, subject.options)
    const input_tokens = runs.reduce((s, r) => s + r.input_tokens, 0)
    const output_tokens = runs.reduce((s, r) => s + r.output_tokens, 0)
    const model_calls = answers.reduce((s, a) => s + a.calls, 0)

    const { data: row, error: insErr } = await admin
      .from('pulse_ai_predictions')
      .insert({
        market_id: marketId,
        model,
        prompt_version: CONTRASTE_PROMPT_VERSION,
        persona_version: PERSONA_VERSION,
        vote_mode: subject.voteMode,
        subject,
        subject_hash: hash,
        n_runs: nRuns,
        n_personas: Math.max(...panels.map((p) => p.length)),
        option_distribution: agg.option_distribution,
        option_spread: agg.option_spread,
        confidence_distribution: agg.confidence_distribution,
        avg_confidence: agg.avg_confidence,
        runs,
        input_tokens,
        output_tokens,
        model_calls,
        cost_usd: costUsd(input_tokens, output_tokens),
        trigger_source: source,
      })
      .select('id, status, locked_at, cost_usd')
      .single()
    if (insErr) {
      // A concurrent caller locked the same wording first: fine.
      if (insErr.code === '23505') return { ok: true, skipped: true, reason: 'exists' }
      throw new Error(insErr.message)
    }
    return { ok: true, skipped: false, id: row.id, status: row.status, locked_at: row.locked_at, cost_usd: Number(row.cost_usd), model_calls }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[contraste-ia] lock failed', marketId, error)
    return { ok: false, error }
  }
}

/** Resolve within `ms`, else report a timeout (the work keeps running in the background). */
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))])
}

export type ContrastePrediction = {
  model: string
  promptVersion: string
  nRuns: number
  nPersonas: number
  status: 'locked' | 'late'
  lockedAt: string
  firstVoteAt: string | null
  optionDistribution: Record<string, number>
  optionSpread: Record<string, number>
  confidenceDistribution: Record<string, number>
  avgConfidence: number | null
  /** Wording differs from what was later published. */
  stale: boolean
}

export type ContrasteData = {
  options: string[]
  prediction: ContrastePrediction | null
  human: {
    voters: number
    optionShare: Record<string, number>
    confidenceDistribution: Record<string, number>
    unknown: number
    avgConfidence: number | null
  }
  comparison: Comparison | null
}

/** Full Contraste payload. NO visibility checks here — callers must gate. */
export async function loadContraste(admin: SupabaseClient, marketId: string): Promise<ContrasteData | null> {
  let subject: Subject
  try {
    subject = await readSubject(admin, marketId)
  } catch {
    return null
  }
  const hash = subjectHash(subject)
  const { data: rows } = await admin
    .from('pulse_ai_predictions')
    .select('*')
    .eq('market_id', marketId)
    .order('locked_at', { ascending: false })
  const list = (rows ?? []) as Array<Record<string, any>>
  const best = list.find((r) => r.subject_hash === hash) ?? list[0] ?? null

  // Human side: % of voters choosing each option (multi: pick rate), certainty histogram.
  const { data: outs } = await admin.from('market_outcomes').select('id, label').eq('market_id', marketId)
  const labelOf = new Map((outs ?? []).map((o: { id: string; label: string }) => [o.id, o.label]))
  const { data: votes } = await admin.from('market_votes').select('id, outcome_id, confidence').eq('market_id', marketId)
  const vlist = (votes ?? []) as Array<{ id: string; outcome_id: string; confidence: number }>
  const picks = new Map<string, Set<string>>()
  if (subject.voteMode === 'multi' && vlist.length) {
    const { data: sels } = await admin.from('market_vote_selections').select('vote_id, outcome_id').eq('market_id', marketId)
    for (const s of (sels ?? []) as Array<{ vote_id: string; outcome_id: string }>) {
      if (!picks.has(s.vote_id)) picks.set(s.vote_id, new Set())
      picks.get(s.vote_id)!.add(s.outcome_id)
    }
  }
  const count: Record<string, number> = Object.fromEntries(subject.options.map((o) => [o, 0]))
  const conf: Record<string, number> = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), 0]))
  let unknown = 0
  let cs = 0
  let cn = 0
  for (const v of vlist) {
    const ids = picks.get(v.id) ?? new Set([v.outcome_id])
    for (const id of ids) {
      const l = labelOf.get(id)
      if (l && l in count) count[l] += 1
    }
    if (v.confidence >= 1 && v.confidence <= 10) {
      conf[String(v.confidence)] += 1
      cs += v.confidence
      cn += 1
    } else unknown += 1
  }
  const voters = vlist.length
  const optionShare = Object.fromEntries(subject.options.map((o) => [o, voters ? count[o] / voters : 0]))

  const prediction: ContrastePrediction | null = best
    ? {
        model: best.model,
        promptVersion: best.prompt_version,
        nRuns: best.n_runs,
        nPersonas: best.n_personas,
        status: best.status,
        lockedAt: best.locked_at,
        firstVoteAt: best.first_vote_at,
        optionDistribution: best.option_distribution,
        optionSpread: best.option_spread ?? {},
        confidenceDistribution: best.confidence_distribution,
        avgConfidence: best.avg_confidence == null ? null : Number(best.avg_confidence),
        stale: best.subject_hash !== hash,
      }
    : null

  return {
    options: subject.options,
    prediction,
    human: { voters, optionShare, confidenceDistribution: conf, unknown, avgConfidence: cn ? Math.round((cs / cn) * 10) / 10 : null },
    comparison: prediction && voters > 0 ? compare(subject.options, prediction.optionDistribution, optionShare) : null,
  }
}

/** True when this viewer (account or guest id) has a vote on the Pulse. */
export async function viewerHasVoted(
  admin: SupabaseClient,
  marketId: string,
  ids: { userId?: string | null; guestId?: string | null },
): Promise<boolean> {
  const uuid = /^[0-9a-f-]{36}$/i
  for (const id of [ids.userId, ids.guestId]) {
    if (!id || !uuid.test(id)) continue
    const { count } = await admin
      .from('market_votes')
      .select('id', { count: 'exact', head: true })
      .eq('market_id', marketId)
      .eq('user_id', id)
    if ((count ?? 0) > 0) return true
  }
  return false
}

/**
 * Does a prediction exist (for the content-free pre-vote teaser)?
 * By default only LOCKED (pre-vote) rows count: the teaser ("La IA ya
 * respondió") is a public claim, and 'late' predictions never back claims.
 */
export async function hasPrediction(
  admin: SupabaseClient,
  marketId: string,
  opts: { lockedOnly?: boolean } = {},
): Promise<boolean> {
  let q = admin
    .from('pulse_ai_predictions')
    .select('id', { count: 'exact', head: true })
    .eq('market_id', marketId)
  if (opts.lockedOnly !== false) q = q.eq('status', 'locked')
  const { count } = await q
  return (count ?? 0) > 0
}

/**
 * Backstop (runs from the push-receipts cron every 10 min): Pulses created or
 * published outside the app routes (SQL) get a prediction. Drafts are covered
 * too so SQL-published Pulses are usually locked before publish. At most
 * `max` per tick to fit the cron budget. Retries naturally on the next tick.
 */
export async function runContrasteBackstop(admin: SupabaseClient, max = 1): Promise<{ locked: string[]; failed: string[] }> {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const { data } = await admin
    .from('prediction_markets')
    .select('id, is_draft, vote_mode, created_at, pulse_ai_predictions(id)')
    .eq('is_pulse', true)
    .gte('created_at', since)
    .in('status', ['active', 'trading'])
    .order('created_at', { ascending: false })
    .limit(40)
  const todo = ((data ?? []) as Array<{ id: string; is_draft: boolean; pulse_ai_predictions: unknown[] | null }>)
    .filter((m) => !m.pulse_ai_predictions?.length)
    .sort((a, b) => Number(a.is_draft) - Number(b.is_draft)) // published first
    .slice(0, max)
  const locked: string[] = []
  const failed: string[] = []
  for (const m of todo) {
    const r = await ensurePredictionLocked(admin, m.id, m.is_draft ? 'draft' : 'backstop')
    ;(r.ok ? locked : failed).push(m.id)
  }
  return { locked, failed }
}
