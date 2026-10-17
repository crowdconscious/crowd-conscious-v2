/**
 * Contraste IA for org readings — server orchestration (service role only).
 *
 *  ensureOrgPredictionLocked(): run the persona panel N times synchronously
 *  (Haiku, Messages API, not batch). Each persona answers the whole survey in
 *  one call. Inserts ONE immutable row per question into org_ai_predictions;
 *  the DB trigger stamps locked_at and marks rows 'late' if any response exists.
 *  Input is strictly what a respondent sees: org name, title, question texts.
 *
 *  loadOrgContraste(): locked predictions keyed by question id. Callers only
 *  attach them to CLOSED readings for members (lib/org/repo.ts loadReading);
 *  the public survey (/e/<token>) and share links never receive them.
 */
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MODELS, getAnthropicClient } from '@/lib/agents/config'
import { renderAgentSystemPrompt } from '@/lib/simulation/prompts'
import { personaStratumKey } from '@/lib/simulation/run'
import { costUsd, splitPanels } from './core'
import { configuredRuns } from './server'
import {
  ORG_PROMPT_VERSION,
  aggregateOrgRuns,
  buildOrgUserPrompt,
  parseOrgAnswers,
  questionHash,
  type OrgPanelAnswer,
  type OrgSubject,
  type QuestionContraste,
} from './org-core'

const PERSONA_VERSION = 'cdmx-v1'
const PER_RUN = Number(process.env.CONTRASTE_IA_PERSONAS_PER_RUN) || 50
const CONCURRENCY = 15

type Source = 'open' | 'backstop' | 'manual'

export async function readOrgSubject(admin: SupabaseClient, readingId: string): Promise<OrgSubject> {
  const { data: r, error } = await admin
    .from('org_readings')
    .select('id, title_es, title_en, orgs(name, locale)')
    .eq('id', readingId)
    .single()
  if (error || !r) throw new Error(`contraste-org: reading ${readingId} not found`)
  const org = (Array.isArray(r.orgs) ? r.orgs[0] : r.orgs) as { name?: string; locale?: string } | null
  const locale = org?.locale === 'en' ? 'en' : 'es'
  const { data: qs } = await admin.from('org_questions').select('id, position, text_es, text_en').eq('reading_id', readingId).order('position')
  const questions = ((qs ?? []) as { id: string; position: number; text_es: string; text_en: string }[]).map((q) => ({
    id: q.id,
    position: q.position,
    text: locale === 'en' ? q.text_en : q.text_es,
  }))
  if (!questions.length) throw new Error(`contraste-org: reading ${readingId} has no questions`)
  return { orgName: org?.name ?? '', title: locale === 'en' ? r.title_en : r.title_es, locale, questions }
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

export type OrgLockResult =
  | { ok: true; skipped: true; reason: 'exists' }
  | { ok: true; skipped: false; locked: number; status: 'locked' | 'late'; cost_usd: number; model_calls: number }
  | { ok: false; error: string }

/** Idempotent per question wording. Never throws (opening the field must not fail because of it). */
export async function ensureOrgPredictionLocked(admin: SupabaseClient, readingId: string, source: Source): Promise<OrgLockResult> {
  try {
    const subject = await readOrgSubject(admin, readingId)
    const hashes = subject.questions.map((q) => questionHash(subject, q.text))
    const { data: existing } = await admin.from('org_ai_predictions').select('question_id, subject_hash').eq('reading_id', readingId)
    const have = new Set(((existing ?? []) as { question_id: string; subject_hash: string }[]).map((e) => `${e.question_id}:${e.subject_hash}`))
    const missing = subject.questions.filter((q, i) => !have.has(`${q.id}:${hashes[i]}`))
    if (!missing.length) return { ok: true, skipped: true, reason: 'exists' }

    const { data: personas, error: pErr } = await admin.from('simulation_personas').select('*').eq('version', PERSONA_VERSION)
    if (pErr || !personas?.length) throw new Error(`no personas for ${PERSONA_VERSION}`)
    const sorted = [...personas].sort((a, b) => {
      const ka = personaStratumKey(a) + a.id
      const kb = personaStratumKey(b) + b.id
      return ka < kb ? -1 : ka > kb ? 1 : 0
    })
    const nRuns = configuredRuns()
    const panels = splitPanels(sorted, nRuns, PER_RUN)
    // The persona always answers the full survey (context matters), even if only some questions are missing.
    const userPrompt = buildOrgUserPrompt(subject)
    const nQ = subject.questions.length
    const maxTokens = Math.min(800, 60 + 30 * nQ)
    const client = getAnthropicClient()
    const model = MODELS.FAST
    const jobs = panels.flatMap((panel, run) => panel.map((persona) => ({ run, persona })))
    const answers = await pool(jobs, CONCURRENCY, async ({ run, persona }) => {
      let tin = 0
      let tout = 0
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const msg = await client.messages.create({
            model,
            max_tokens: maxTokens,
            temperature: 1,
            system: renderAgentSystemPrompt(persona),
            messages: [{ role: 'user', content: userPrompt }],
          })
          tin += msg.usage?.input_tokens ?? 0
          tout += msg.usage?.output_tokens ?? 0
          const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
          const sheet = parseOrgAnswers(text, nQ)
          if (sheet || attempt === 1) return { run, sheet, tin, tout, calls: attempt + 1 }
        } catch {
          if (attempt === 1) return { run, sheet: null, tin, tout, calls: 2 }
        }
      }
      return { run, sheet: null, tin, tout, calls: 2 }
    })
    const runs: OrgPanelAnswer[][][] = panels.map((_, run) =>
      answers.filter((a) => a.run === run && a.sheet).map((a) => a.sheet as OrgPanelAnswer[]),
    )
    const valid = runs.reduce((s, r) => s + r.length, 0)
    if (valid < jobs.length * 0.6) throw new Error(`only ${valid}/${jobs.length} valid panel answers`)
    const agg = aggregateOrgRuns(runs, nQ)
    const input_tokens = answers.reduce((s, a) => s + a.tin, 0)
    const output_tokens = answers.reduce((s, a) => s + a.tout, 0)
    const model_calls = answers.reduce((s, a) => s + a.calls, 0)
    const total = costUsd(input_tokens, output_tokens)
    const per = (x: number) => Math.round(x / missing.length)

    const rows = missing.map((q) => {
      const qi = subject.questions.findIndex((x) => x.id === q.id)
      const a = agg[qi]
      return {
        reading_id: readingId,
        question_id: q.id,
        model,
        prompt_version: ORG_PROMPT_VERSION,
        persona_version: PERSONA_VERSION,
        subject: { org_name: subject.orgName, title: subject.title, locale: subject.locale, question: q.text, position: qi + 1, total: nQ },
        subject_hash: hashes[qi],
        n_runs: nRuns,
        n_personas: Math.max(...panels.map((p) => p.length)),
        yes_share: a.yes_share,
        yes_spread: a.yes_spread,
        yes_certainty: a.yes_certainty,
        no_certainty: a.no_certainty,
        avg_certainty: a.avg_certainty,
        runs: a.runs.map((r, i) => ({ ...r, attempted: panels[i]?.length ?? 0 })),
        input_tokens: per(input_tokens),
        output_tokens: per(output_tokens),
        model_calls: per(model_calls),
        cost_usd: Math.round((total / missing.length) * 100000) / 100000,
        trigger_source: source,
      }
    })
    let locked = 0
    let status: 'locked' | 'late' = 'locked'
    for (const row of rows) {
      const { data, error } = await admin.from('org_ai_predictions').insert(row).select('status').single()
      if (error) {
        if (error.code === '23505') continue // concurrent caller locked it first
        throw new Error(error.message)
      }
      locked += 1
      if (data?.status === 'late') status = 'late'
    }
    if (!locked) return { ok: true, skipped: true, reason: 'exists' }
    return { ok: true, skipped: false, locked, status, cost_usd: total, model_calls }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[contraste-ia/org] lock failed', readingId, error)
    return { ok: false, error }
  }
}

/** Locked predictions by question id (newest matching wording wins). NO visibility checks: callers gate. */
export async function loadOrgContraste(
  admin: SupabaseClient,
  readingId: string,
  current: { id: string; hash: string }[],
): Promise<Map<string, QuestionContraste>> {
  const { data } = await admin.from('org_ai_predictions').select('*').eq('reading_id', readingId).order('locked_at', { ascending: false })
  const list = (data ?? []) as Array<Record<string, any>>
  const out = new Map<string, QuestionContraste>()
  for (const q of current) {
    const mine = list.filter((r) => r.question_id === q.id)
    const best = mine.find((r) => r.subject_hash === q.hash) ?? mine[0]
    if (!best) continue
    out.set(q.id, {
      aiYes: Number(best.yes_share),
      spread: Number(best.yes_spread),
      avgCertainty: best.avg_certainty == null ? null : Number(best.avg_certainty),
      model: best.model,
      nRuns: best.n_runs,
      nPersonas: best.n_personas,
      status: best.status,
      lockedAt: best.locked_at,
      firstResponseAt: best.first_response_at,
      stale: best.subject_hash !== q.hash,
    })
  }
  return out
}

/**
 * Backstop (push-receipts cron, every 10 min): readings in design (so they are
 * locked before opening, e.g. created via SQL) or in field without a
 * prediction (open-time lock failed or timed out). One reading per tick.
 */
export async function runOrgContrasteBackstop(admin: SupabaseClient, max = 1): Promise<{ locked: string[]; failed: string[] }> {
  const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()
  const { data } = await admin
    .from('org_readings')
    .select('id, status, created_at, org_ai_predictions(id)')
    .in('status', ['design', 'field'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(40)
  const todo = ((data ?? []) as Array<{ id: string; status: string; org_ai_predictions: unknown[] | null }>)
    .filter((r) => !r.org_ai_predictions?.length)
    .sort((a, b) => Number(a.status === 'design') - Number(b.status === 'design')) // field first: already exposed
    .slice(0, max)
  const locked: string[] = []
  const failed: string[] = []
  for (const r of todo) {
    const res = await ensureOrgPredictionLocked(admin, r.id, 'backstop')
    ;(res.ok ? locked : failed).push(r.id)
  }
  return { locked, failed }
}
