/**
 * Signals Moderator — AI triage for newly submitted Citizen Signals.
 *
 * Reads one `citizen_signals` row + a window of recently published siblings
 * (same target_kind, last 60 days) for duplicate context, calls Anthropic
 * with a tool-use schema, validates with zod, and writes the structured
 * assessment to `citizen_signals.ai_scores`. Also appends a row to
 * `citizen_signal_moderation_events` with `action='ai_assessed'` and calls
 * `logAgentRun` per the CLAUDE.md convention.
 *
 * Non-blocking: the API route enqueues this via `after()` (Next 15) so the
 * user-facing POST returns immediately. On any agent error we still persist
 * a structured fallback record (`recommended_action='human_review'` with
 * `recommendation_rationale='agent_error: <message>'`) so the admin queue
 * always sees that the agent ran, even on failure.
 *
 * MVP scope: no embeddings. Duplicate detection is "give the model recent
 * sibling titles + bodies and ask it to flag overlap". Phase 2 can add
 * pgvector similarity.
 */

import type {
  MessageCreateParamsNonStreaming,
  Tool,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages/messages'
import { after } from 'next/server'
import { z } from 'zod'

import {
  getAnthropicClient,
  logAgentRun,
  MODELS,
} from '@/lib/agents/config'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { SIGNAL_CATEGORIES } from '@/lib/i18n/citizen-signals'
import type { Json } from '@/types/database'
import {
  SIGNALS_MODERATOR_SCHEMA_VERSION,
  SIGNALS_MODERATOR_SYSTEM_PROMPT,
  SIGNALS_MODERATOR_TOOL_NAME,
  SIGNALS_MODERATOR_TOOL_SCHEMA,
  buildFallbackOutput,
} from '@/lib/agents/signals-moderator.prompt'

const AGENT_NAME = 'signals-moderator'

// Haiku family — same default as inbox-curator. Triage is bounded and
// frequent; the cheaper tier is the right call until we have signal on
// quality regressions.
const SIGNALS_MODERATOR_MODEL = MODELS.FAST

// Cap output. The structured tool output is well under this; the buffer
// is for the model to "think" before emitting the tool call. Increasing
// it beyond ~2k yields no measurable quality win on this task.
const SIGNALS_MODERATOR_MAX_TOKENS = 1500

// How many recently-published sibling signals (same target_kind) to feed
// to the model for duplicate detection.
const DUPLICATE_CONTEXT_LIMIT = 25
const DUPLICATE_CONTEXT_WINDOW_DAYS = 60

// -----------------------------------------------------------------------------
// Output schema
// -----------------------------------------------------------------------------

export interface SignalsModeratorOutput {
  schema_version: 1
  category_guess: string
  category_confidence: number
  severity_guess: 'low' | 'medium' | 'high' | 'critical'
  severity_confidence: number
  pii_detected: Array<{
    kind:
      | 'email'
      | 'phone'
      | 'address'
      | 'rfc'
      | 'curp'
      | 'name_third_party'
      | 'other'
    sample: string
    offset?: number
  }>
  defamation_risk: 'low' | 'medium' | 'high'
  defamation_reasons: string[]
  duplicate_candidates: Array<{
    signal_id: string
    similarity: number
    reason: string
  }>
  summary_es: string
  summary_en: string
  recommended_action: 'auto_publish' | 'human_review' | 'request_edit' | 'reject'
  recommendation_rationale: string
  generated_at: string
  model: string
}

const piiKindSchema = z.enum([
  'email',
  'phone',
  'address',
  'rfc',
  'curp',
  'name_third_party',
  'other',
])

const moderatorOutputSchema = z.object({
  schema_version: z.literal(1),
  category_guess: z.enum(SIGNAL_CATEGORIES),
  category_confidence: z.number().min(0).max(1),
  severity_guess: z.enum(['low', 'medium', 'high', 'critical']),
  severity_confidence: z.number().min(0).max(1),
  pii_detected: z
    .array(
      z.object({
        kind: piiKindSchema,
        sample: z.string().min(1).max(120),
        offset: z.number().int().min(0).optional(),
      })
    )
    .max(20),
  defamation_risk: z.enum(['low', 'medium', 'high']),
  defamation_reasons: z.array(z.string().max(240)).max(6),
  duplicate_candidates: z
    .array(
      z.object({
        signal_id: z.string().min(1),
        similarity: z.number().min(0).max(1),
        reason: z.string().max(240),
      })
    )
    .max(5),
  summary_es: z.string().min(1).max(600),
  summary_en: z.string().min(1).max(600),
  recommended_action: z.enum([
    'auto_publish',
    'human_review',
    'request_edit',
    'reject',
  ]),
  recommendation_rationale: z.string().min(1).max(400),
})

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Fire-and-forget wrapper used by the create API.
 *
 * Prefers Next 15's `after()` (runs the callback after the response is
 * flushed). When `after()` is unavailable (e.g. invoked outside a request
 * scope), falls back to a top-level promise the runtime is free to drop
 * — that's acceptable because the agent's own catch persists a fallback
 * record before it would otherwise crash unhandled.
 */
export function enqueueSignalsModerator(signalId: string): void {
  const task = async () => {
    try {
      await runSignalsModerator(signalId)
    } catch (err) {
      // runSignalsModerator already persists a fallback row on any thrown
      // error path; this catch only fires if something inside its own
      // error-handling threw. Log and swallow so we never propagate an
      // unhandled rejection into the platform.
      console.error('[signals-moderator] enqueue task failed', err)
    }
  }

  // Best-effort `after()` so the agent runs after the POST response is
  // flushed. `after` is only legal inside a Next request scope; if the
  // caller is outside one (background script, test harness), fall back
  // to a detached promise.
  try {
    after(task)
  } catch {
    void task()
  }
}

/**
 * Synchronous entrypoint. Always resolves with a `SignalsModeratorOutput`
 * — on internal error it returns (and persists) the fallback record.
 */
export async function runSignalsModerator(
  signalId: string
): Promise<SignalsModeratorOutput> {
  const startTime = Date.now()
  const supabase = createSignalsAdminClient()

  // Step 1: load the signal. If this fails we cannot persist anything
  // back to citizen_signals, so log and bail with the fallback shape but
  // do NOT attempt to update a row that may not exist.
  const { data: signal, error: signalErr } = await supabase
    .from('citizen_signals')
    .select(
      'id, title, body, language, category, severity, target_kind, citizen_target_id, conscious_location_id, created_at'
    )
    .eq('id', signalId)
    .maybeSingle()

  if (signalErr || !signal) {
    const msg = signalErr?.message ?? 'signal not found'
    console.error('[signals-moderator] fetch signal failed', signalId, msg)
    await logAgentRun({
      agentName: AGENT_NAME,
      status: 'error',
      durationMs: Date.now() - startTime,
      errorMessage: `fetch signal failed: ${msg}`,
      summary: { signal_id: signalId, stage: 'fetch_signal' },
    }).catch(() => {})
    return buildFallbackOutput({
      reason: `fetch signal failed: ${msg}`,
      model: SIGNALS_MODERATOR_MODEL,
    })
  }

  // Step 2: load duplicate context (best-effort). Observation signals have no
  // target_kind — skip sibling lookup rather than querying with NULL.
  const since = new Date(
    Date.now() - DUPLICATE_CONTEXT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
  const { data: siblings } =
    signal.target_kind != null
      ? await supabase
          .from('citizen_signals')
          .select(
            'id, title, body, category, severity, citizen_target_id, created_at'
          )
          .eq('target_kind', signal.target_kind)
          .eq('publication_status', 'published')
          .neq('id', signal.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(DUPLICATE_CONTEXT_LIMIT)
      : { data: [] as const }

  // Trim sibling bodies aggressively — we only need enough text to
  // judge overlap. Long verbatim bodies blow the prompt out for no win.
  const trimmedSiblings = (siblings ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    body: typeof s.body === 'string' ? s.body.slice(0, 400) : '',
    category: s.category,
    severity: s.severity,
    citizen_target_id: s.citizen_target_id,
    created_at: s.created_at,
  }))

  // Step 3: call the model with tool-use forced.
  let parsed: SignalsModeratorOutput
  let tokensInput = 0
  let tokensOutput = 0

  try {
    const anthropic = getAnthropicClient()

    const userMessage = buildUserMessage({
      signal: {
        id: signal.id,
        title: signal.title,
        body: signal.body,
        language: signal.language,
        category_self_reported: signal.category,
        severity_self_reported: signal.severity,
        target_kind: signal.target_kind,
        citizen_target_id: signal.citizen_target_id,
        conscious_location_id: signal.conscious_location_id,
        created_at: signal.created_at,
      },
      siblings: trimmedSiblings,
    })

    const createParams: MessageCreateParamsNonStreaming = {
      model: SIGNALS_MODERATOR_MODEL,
      max_tokens: SIGNALS_MODERATOR_MAX_TOKENS,
      system: SIGNALS_MODERATOR_SYSTEM_PROMPT,
      tools: [
        {
          name: SIGNALS_MODERATOR_TOOL_NAME,
          description:
            'Devuelve la evaluación estructurada de la señal ciudadana.',
          // Our schema is built with `as const` for accurate enum-literal
          // narrowing; the SDK's `Tool.InputSchema` is a mutable
          // `{ type: 'object'; [k]: unknown }`. Cast at the boundary.
          input_schema:
            SIGNALS_MODERATOR_TOOL_SCHEMA as unknown as Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: SIGNALS_MODERATOR_TOOL_NAME },
      messages: [{ role: 'user', content: userMessage }],
    }

    const response = await anthropic.messages.create(createParams)
    tokensInput = response.usage?.input_tokens ?? 0
    tokensOutput = response.usage?.output_tokens ?? 0

    const toolUse = response.content.find(
      (b): b is ToolUseBlock =>
        b.type === 'tool_use' && b.name === SIGNALS_MODERATOR_TOOL_NAME
    )
    if (!toolUse) {
      throw new Error('model did not invoke submit_assessment tool')
    }

    const validated = moderatorOutputSchema.parse(toolUse.input)

    parsed = {
      ...validated,
      // Filter duplicate_candidates to ids the model could actually see
      // in the prompt; the model occasionally hallucinates uuids.
      duplicate_candidates: validated.duplicate_candidates.filter((c) =>
        trimmedSiblings.some((s) => s.id === c.signal_id)
      ),
      generated_at: new Date().toISOString(),
      model: SIGNALS_MODERATOR_MODEL,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[signals-moderator] model/validation failed', signalId, message)
    parsed = buildFallbackOutput({
      reason: message.slice(0, 200),
      model: SIGNALS_MODERATOR_MODEL,
    })
  }

  // Step 4: persist. Both writes are best-effort — we still return the
  // parsed value to the caller (manual re-run flow surfaces it inline).

  // The DB column is jsonb (`Json` in generated types). Our struct is
  // strictly typed but its union members (e.g. arrays of objects) are
  // narrower than `Json`; cast at the persistence boundary.
  const aiScoresJson = parsed as unknown as Json

  const { error: updateErr } = await supabase
    .from('citizen_signals')
    .update({ ai_scores: aiScoresJson })
    .eq('id', signal.id)
  if (updateErr) {
    console.error(
      '[signals-moderator] update ai_scores failed',
      signal.id,
      updateErr.message
    )
  }

  // Audit event. admin_user_id is the signal author for AI events — the
  // table requires NOT NULL and there's no system user; the `detail`
  // makes the source unambiguous.
  const { data: authorRow } = await supabase
    .from('citizen_signals')
    .select('author_user_id')
    .eq('id', signal.id)
    .maybeSingle()

  if (authorRow?.author_user_id) {
    const { error: eventErr } = await supabase
      .from('citizen_signal_moderation_events')
      .insert({
        signal_id: signal.id,
        admin_user_id: authorRow.author_user_id,
        action: 'ai_assessed',
        detail: {
          source: 'lib/agents/signals-moderator',
          model: SIGNALS_MODERATOR_MODEL,
          schema_version: SIGNALS_MODERATOR_SCHEMA_VERSION,
          recommended_action: parsed.recommended_action,
          severity_guess: parsed.severity_guess,
          category_guess: parsed.category_guess,
          pii_count: parsed.pii_detected.length,
          defamation_risk: parsed.defamation_risk,
          duplicate_candidates_count: parsed.duplicate_candidates.length,
          recommendation_rationale: parsed.recommendation_rationale,
        } as unknown as Json,
      })
    if (eventErr) {
      console.error(
        '[signals-moderator] insert moderation event failed',
        signal.id,
        eventErr.message
      )
    }
  }

  const status: 'success' | 'error' = parsed.recommendation_rationale.startsWith(
    'agent_error:'
  )
    ? 'error'
    : 'success'

  await logAgentRun({
    agentName: AGENT_NAME,
    status,
    durationMs: Date.now() - startTime,
    tokensInput,
    tokensOutput,
    errorMessage:
      status === 'error' ? parsed.recommendation_rationale : undefined,
    summary: {
      signal_id: signal.id,
      model: SIGNALS_MODERATOR_MODEL,
      recommended_action: parsed.recommended_action,
      severity_guess: parsed.severity_guess,
      category_guess: parsed.category_guess,
      defamation_risk: parsed.defamation_risk,
      pii_count: parsed.pii_detected.length,
      duplicate_candidates_count: parsed.duplicate_candidates.length,
      siblings_considered: trimmedSiblings.length,
    },
  }).catch((logErr) => {
    console.error('[signals-moderator] logAgentRun failed', logErr)
  })

  return parsed
}

// -----------------------------------------------------------------------------
// User-message builder
// -----------------------------------------------------------------------------

type ModeratorSignalContext = {
  id: string
  title: string
  body: string
  language: string
  category_self_reported: string
  severity_self_reported: string
  target_kind: string | null
  citizen_target_id: string | null
  conscious_location_id: string | null
  created_at: string
}

type ModeratorSibling = {
  id: string
  title: string
  body: string
  category: string
  severity: string
  citizen_target_id: string | null
  created_at: string
}

function buildUserMessage(args: {
  signal: ModeratorSignalContext
  siblings: ModeratorSibling[]
}): string {
  const { signal, siblings } = args
  const siblingsText = siblings.length
    ? JSON.stringify(siblings, null, 2)
    : '[]'

  return `SEÑAL A EVALUAR (idioma del autor: ${signal.language}):
${JSON.stringify(
  {
    id: signal.id,
    title: signal.title,
    body: signal.body,
    category_self_reported: signal.category_self_reported,
    severity_self_reported: signal.severity_self_reported,
    target_kind: signal.target_kind,
    citizen_target_id: signal.citizen_target_id,
    conscious_location_id: signal.conscious_location_id,
    created_at: signal.created_at,
  },
  null,
  2
)}

SEÑALES PUBLICADAS RECIENTES (mismo target_kind, últimos ${DUPLICATE_CONTEXT_WINDOW_DAYS} días, máx ${DUPLICATE_CONTEXT_LIMIT}). Úsalas SOLO para evaluar duplicate_candidates. Si encuentras solapamiento, refiere su id exacto:
${siblingsText}

Devuelve tu evaluación llamando a la herramienta submit_assessment. No respondas con texto libre.`
}
