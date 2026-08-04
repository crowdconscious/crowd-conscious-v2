/**
 * Pulse Simulation pipeline — "B pipeline" (§5.5).
 *
 * Runs a panel of demographically grounded LLM personas over a Pulse question
 * via the Anthropic **Message Batches API** (Haiku, 50% batch discount), parses
 * their votes, and computes aggregates + a Divergence Index against the real
 * Pulse. This module is SERVER-ONLY: every DB touch goes through the service-role
 * admin client (RLS bypass, §1.2) and NOTHING here is ever sent to a client —
 * user-facing surfaces read exclusively through the `revealed_simulation_runs`
 * view (§5.2), never these functions.
 *
 * Hard guardrails honored here (release-blockers, §1/§5/§10):
 *  - Real vote data is sacred: this module NEVER writes to `prediction_markets`
 *    or any real vote table. `market_id` is read-only — we only READ market
 *    metadata (`prediction_markets`, `market_outcomes`) and real votes
 *    (`market_votes`) to build the real aggregates for divergence.
 *  - Real and simulated aggregates are computed with the SAME canonical math
 *    (`lib/pulse-vote-aggregates.ts`) so the comparison is valid (§1.5).
 *  - Model ids come only from `lib/agents/config.ts` `MODELS` (§1) — never
 *    hardcoded here.
 *
 * Testability: the pure, dependency-free helpers (`computeRunAggregates`,
 * `computeAggregateSnapshot`, `selectStratifiedSample`, the cost-envelope guard)
 * are exported and covered by `run.test.ts`. The orchestration functions load
 * their `@/…` dependencies (the Anthropic client, the admin client, `MODELS`)
 * via dynamic `import()` INSIDE the async body so that importing this module
 * under the `node --test` TypeScript runner (which does not resolve the `@/`
 * path alias) never triggers those imports for the pure-function tests.
 *
 * The `simulation_*` tables (migrations 252-254) are modeled in the generated
 * `Database` types, so the admin client is typed as `SupabaseClient<Database>`
 * and `.from('simulation_*')` flows those types. The only casts that remain are
 * narrow jsonb⇄domain narrowings for the `aggregates`/`divergence` columns,
 * which the generator can only see as `Json`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../types/database.ts'
import type AnthropicClient from '@anthropic-ai/sdk'
// Type-only imports from the SDK subpaths (erased at runtime; keeps the module
// loadable by the `node --test` type-stripping runner without pulling the SDK).
import type { BatchCreateParams } from '@anthropic-ai/sdk/resources/messages/batches'
import type { Message } from '@anthropic-ai/sdk/resources/messages/messages'

import {
  aggregatePulseVotes,
  outcomeAvgConfidence,
  type PulseVoteLike,
} from '../pulse-vote-aggregates.ts'
import {
  PROMPT_VERSION,
  renderAgentSystemPrompt,
  buildAgentUserPrompt,
  parseAgentVote,
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserPrompt,
  type PromptPersona,
  type SampledReasoning,
} from './prompts.ts'
import {
  computeDivergence,
  type AggregateSnapshot,
  type DivergenceResult,
} from './divergence.ts'
import { allocatePersonaCounts } from './persona-allocation.ts'

// ---------------------------------------------------------------------------
// simulation_* row shapes. The tables live in the generated `Database` types
// (migrations 252-254), so we derive from them directly. The only shapes we
// still model by hand are the DOMAIN types for the two `jsonb` columns
// (`aggregates`, `divergence`), which the generator can only see as `Json`.
// ---------------------------------------------------------------------------

/** `simulation_personas` row (migration 252). */
export type SimulationPersonaRow =
  Database['public']['Tables']['simulation_personas']['Row']

/** `simulation_runs.aggregates` jsonb shape (§5.5). */
export interface RunAggregates {
  option_shares: Record<string, number>
  avg_confidence_by_option: Record<string, number>
  confidence_weighted_shares: Record<string, number>
  completion_rate: number
  /** Sonnet synthesis (§5.4), attached by `runSynthesis`. */
  synthesis?: SynthesisResult
  /**
   * The decode context needed to parse votes in a later `checkRun` invocation
   * and to audit exactly what the panel was shown. Not user-facing beyond what
   * a real voter already sees (question/description/options).
   */
  request_context?: RunRequestContext
}

/** The public question + options the panel voted on (what a real voter sees). */
export interface RunRequestContext {
  question: string
  description: string | null
  options: string[]
}

/**
 * `simulation_runs` row (migration 253) with the two `jsonb` columns narrowed
 * from `Json` to their domain shapes (`aggregates`, `divergence`). Every other
 * field flows straight from the generated row type.
 */
export type SimulationRunRow = Omit<
  Database['public']['Tables']['simulation_runs']['Row'],
  'aggregates' | 'divergence'
> & {
  aggregates: RunAggregates | null
  divergence: DivergenceResult | null
}

/** `simulation_votes` insert shape (migration 254). */
type SimulationVoteInsert =
  Database['public']['Tables']['simulation_votes']['Insert']

/**
 * Service-role admin client (§1.2). `createAdminClient()` is created without the
 * `Database` generic (lib/supabase-admin), so `loadAdmin` asserts the generic
 * here to get typed `.from('simulation_*')` access.
 */
type AdminClient = SupabaseClient<Database>

// ---------------------------------------------------------------------------
// Cost-envelope guard (§5.5)
// ---------------------------------------------------------------------------
//
// Haiku list price is $1 / MTok input, $5 / MTok output (see lib/agents/config.ts).
// The Batch API applies a 50% discount. §5.5's envelope is ~800 input / ~120
// output tokens per agent → 200 agents well under $1 via Haiku Batch. If a run's
// estimated OR observed cost is ~10× that envelope, something is wrong (wrong
// model, runaway prompt, huge panel) — STOP and flag rather than proceed.

const HAIKU_INPUT_RATE_PER_TOKEN = 1 / 1_000_000
const HAIKU_OUTPUT_RATE_PER_TOKEN = 5 / 1_000_000
/** Batch API discount vs. synchronous calls. */
export const BATCH_DISCOUNT = 0.5
export const EXPECTED_INPUT_TOKENS_PER_AGENT = 800
export const EXPECTED_OUTPUT_TOKENS_PER_AGENT = 120
/** Trip the guard when observed cost exceeds this multiple of the envelope. */
export const COST_ALERT_MULTIPLIER = 10
/** Defensive upper bound; §5 panels are 100–200 agents (≤5 phrasings for brand). */
export const MAX_AGENTS = 1000

/** Thrown when a run's cost breaches the §5.5 envelope. */
export class CostEnvelopeError extends Error {
  readonly assessment: CostAssessment
  constructor(assessment: CostAssessment) {
    super(
      `Simulation run cost ${assessment.observedCostUsd.toFixed(4)} USD is ` +
        `${assessment.ratio.toFixed(1)}× the expected ${assessment.expectedCostUsd.toFixed(4)} USD ` +
        `envelope for ${assessment.nAgents} agents (limit ${COST_ALERT_MULTIPLIER}×). ` +
        `Stopping per §5.5 cost guard.`,
    )
    this.name = 'CostEnvelopeError'
    this.assessment = assessment
  }
}

export interface CostAssessment {
  nAgents: number
  expectedCostUsd: number
  observedCostUsd: number
  /** observed / expected; Infinity when expected is 0 but observed is not. */
  ratio: number
  withinEnvelope: boolean
}

/** USD cost of one agent's tokens (batch-discounted by default). */
export function agentCostUsd(
  inputTokens: number,
  outputTokens: number,
  opts: { batch?: boolean } = {},
): number {
  const discount = opts.batch === false ? 1 : BATCH_DISCOUNT
  return (
    (inputTokens * HAIKU_INPUT_RATE_PER_TOKEN +
      outputTokens * HAIKU_OUTPUT_RATE_PER_TOKEN) *
    discount
  )
}

/** Expected USD cost of a whole run at the §5.5 per-agent token envelope. */
export function expectedRunCostUsd(
  nAgents: number,
  opts: { batch?: boolean } = {},
): number {
  return (
    nAgents *
    agentCostUsd(
      EXPECTED_INPUT_TOKENS_PER_AGENT,
      EXPECTED_OUTPUT_TOKENS_PER_AGENT,
      opts,
    )
  )
}

/**
 * Assess a run's cost against the §5.5 envelope. `inputTokens`/`outputTokens`
 * are TOTALS across all agents (estimated pre-flight, or observed post-run).
 */
export function assessRunCost(args: {
  nAgents: number
  inputTokens: number
  outputTokens: number
  batch?: boolean
}): CostAssessment {
  const expectedCostUsd = expectedRunCostUsd(args.nAgents, { batch: args.batch })
  const observedCostUsd = agentCostUsd(args.inputTokens, args.outputTokens, {
    batch: args.batch,
  })
  const ratio =
    expectedCostUsd > 0
      ? observedCostUsd / expectedCostUsd
      : observedCostUsd > 0
        ? Infinity
        : 0
  return {
    nAgents: args.nAgents,
    expectedCostUsd,
    observedCostUsd,
    ratio,
    withinEnvelope: ratio <= COST_ALERT_MULTIPLIER,
  }
}

/** Assess and THROW `CostEnvelopeError` if the run breaches the envelope. */
export function assertCostWithinEnvelope(args: {
  nAgents: number
  inputTokens: number
  outputTokens: number
  batch?: boolean
}): CostAssessment {
  const assessment = assessRunCost(args)
  if (!assessment.withinEnvelope) throw new CostEnvelopeError(assessment)
  return assessment
}

// ---------------------------------------------------------------------------
// Pure aggregate computation — reuses lib/pulse-vote-aggregates.ts EXACTLY so
// simulated and real numbers are computed identically (§1.5).
// ---------------------------------------------------------------------------

/** A parsed sim vote as stored/aggregated (the valid subset of a panel). */
export interface ParsedVoteLike {
  option_chosen: string
  confidence: number
  /** Optional; only used by the shared timeline math, which we ignore. */
  created_at?: string
}

const EPOCH_ISO = '1970-01-01T00:00:00.000Z'

/**
 * Build an `AggregateSnapshot` (+ confidence-weighted shares) from a set of
 * votes keyed by option label, using the canonical `aggregatePulseVotes` math.
 * Used for BOTH the simulated panel and the real Pulse (the real side maps
 * `outcome_id → label` first so both are keyed identically).
 *
 *  - `option_shares[o]`             = votes_for(o) / total_votes
 *  - `avg_confidence_by_option[o]`  = `outcomeAvgConfidence` (omitted when null)
 *  - `confidence_weighted_shares[o]`= Σconfidence(o) / Σconfidence(all)
 */
export function computeAggregateSnapshot(votes: readonly PulseVoteLike[]): {
  option_shares: Record<string, number>
  avg_confidence_by_option: Record<string, number>
  confidence_weighted_shares: Record<string, number>
} {
  const agg = aggregatePulseVotes([...votes])
  const option_shares: Record<string, number> = {}
  const avg_confidence_by_option: Record<string, number> = {}
  const confidence_weighted_shares: Record<string, number> = {}

  const totalVotes = agg.totalVotes
  let totalConfidence = 0
  for (const stats of Object.values(agg.byOutcome)) {
    totalConfidence += stats.confidenceSum
  }

  for (const [option, stats] of Object.entries(agg.byOutcome)) {
    option_shares[option] = totalVotes > 0 ? stats.count / totalVotes : 0
    const avg = outcomeAvgConfidence(stats)
    // Omit the key when there's no valid confidence (divergence treats a missing
    // confidence key as "not present on this side").
    if (avg !== null) avg_confidence_by_option[option] = avg
    confidence_weighted_shares[option] =
      totalConfidence > 0 ? stats.confidenceSum / totalConfidence : 0
  }

  return { option_shares, avg_confidence_by_option, confidence_weighted_shares }
}

/**
 * Compute a completed run's aggregates (§5.5) from its parsed (valid) votes and
 * the number of attempted agents. `completion_rate = valid votes / attempted`.
 */
export function computeRunAggregates(
  votes: readonly ParsedVoteLike[],
  attempted: number,
): RunAggregates {
  const pulseVotes: PulseVoteLike[] = votes.map((v) => ({
    outcome_id: v.option_chosen,
    confidence: v.confidence,
    created_at: v.created_at ?? EPOCH_ISO,
  }))
  const snapshot = computeAggregateSnapshot(pulseVotes)
  const completion_rate =
    attempted > 0 ? votes.length / attempted : 0
  return { ...snapshot, completion_rate }
}

/** The subset of a run's aggregates that divergence consumes. */
function toAggregateSnapshot(a: {
  option_shares: Record<string, number>
  avg_confidence_by_option: Record<string, number>
}): AggregateSnapshot {
  return {
    option_shares: a.option_shares,
    avg_confidence_by_option: a.avg_confidence_by_option,
  }
}

// ---------------------------------------------------------------------------
// Stratified persona sampling — preserves the panel's marginal distribution by
// proportional allocation, reusing the Hamilton allocator (`allocatePersonaCounts`).
// ---------------------------------------------------------------------------

/**
 * Deterministic stratum key for a persona: the composite demographic cell
 * (alcaldía × income band × gender × education × age decade). Proportional
 * allocation across these composite cells preserves every marginal at once.
 */
export function personaStratumKey(p: {
  alcaldia?: string | null
  income_band?: string | null
  gender?: string | null
  education?: string | null
  age?: number | null
}): string {
  const ageBucket =
    typeof p.age === 'number' && Number.isFinite(p.age)
      ? `${Math.floor(p.age / 10) * 10}s`
      : 'na'
  return [
    p.alcaldia ?? '',
    p.income_band ?? '',
    p.gender ?? '',
    p.education ?? '',
    ageBucket,
  ].join('|')
}

/**
 * Take a stratified sample of `nAgents` personas that preserves the pool's
 * distribution. Personas are grouped by `keyFn`; `nAgents` is allocated across
 * strata proportional to each stratum's availability via the deterministic
 * largest-remainder allocator (so the sample matches the target marginals and
 * sums to exactly `nAgents`). Within a stratum, personas are taken in a stable
 * `id`-sorted order.
 *
 * If `nAgents >= personas.length` the whole pool is returned (we never
 * oversample). Non-positive `nAgents` yields an empty sample.
 */
export function selectStratifiedSample<T extends { id: string }>(
  personas: readonly T[],
  nAgents: number,
  keyFn: (p: T) => string,
): T[] {
  const n = Math.floor(nAgents)
  if (!Number.isFinite(n) || n <= 0) return []
  if (n >= personas.length) return [...personas]

  const strata = new Map<string, T[]>()
  for (const p of personas) {
    const key = keyFn(p)
    const bucket = strata.get(key)
    if (bucket) bucket.push(p)
    else strata.set(key, [p])
  }

  // Allocate n across all strata proportionally in one shot: put every stratum
  // under a single umbrella "alcaldía" so the allocator distributes n across
  // them (its per-group Hamilton math is exactly what we need here). Because
  // n < total, each stratum's allocation is <= its availability.
  const UMBRELLA = '__all__'
  const cells = [...strata.entries()].map(([key, bucket]) => ({
    alcaldia: UMBRELLA,
    count: bucket.length,
    key,
  }))
  const allocated = allocatePersonaCounts(cells, { [UMBRELLA]: n })

  const out: T[] = []
  for (const cell of allocated) {
    const bucket = strata.get(cell.key)
    if (!bucket) continue
    const sorted = [...bucket].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    )
    for (let i = 0; i < cell.personaCount; i++) out.push(sorted[i])
  }
  return out
}

// ---------------------------------------------------------------------------
// Orchestration (impure). Dependencies loaded via dynamic import — see header.
// ---------------------------------------------------------------------------

const AGENT_MAX_TOKENS = 256
const SYNTHESIS_MAX_TOKENS = 1024
const AGENT_TEMPERATURE = 1.0
/** Up to 30 reasonings, stratified by option, feed the synthesis prompt (§5.4). */
const MAX_SYNTHESIS_REASONINGS = 30

async function loadConfig(): Promise<{
  getAnthropicClient: () => AnthropicClient
  MODELS: { FAST: string; CREATIVE: string }
}> {
  // Dynamic so the pure-function tests never resolve the `@/` alias (see header).
  const mod = await import('@/lib/agents/config')
  return { getAnthropicClient: mod.getAnthropicClient, MODELS: mod.MODELS }
}

async function loadAdmin(): Promise<AdminClient> {
  const mod = await import('@/lib/supabase-admin')
  return mod.createAdminClient() as unknown as AdminClient
}

export interface StartRunInput {
  /** Real Pulse to simulate (READ-ONLY). Omit for a brand pre-test. */
  marketId?: string
  /** Brand pre-test question (used when `isBrandPretest`, no `marketId`). */
  questionOverride?: string
  /** Brand pre-test options (required when `isBrandPretest`). */
  options?: string[]
  /** Optional description shown to the panel (brand pre-test only). */
  description?: string | null
  personaVersion: string
  nAgents: number
  isBrandPretest?: boolean
  /**
   * Backtest against an already-closed Pulse (§5.5.5). Purely informational —
   * `startRun` never rejects a closed market (it only reads metadata) — but the
   * flag is recorded in logs and lets `startBacktestRun` document intent.
   */
  isBacktest?: boolean
  /** Reuse an existing admin client (e.g. from a cron) instead of creating one. */
  adminClient?: AdminClient
}

export interface StartRunResult {
  runId: string
  batchId: string
  /** Actual panel size sampled (may be < requested if the pool is smaller). */
  nAgents: number
  requestContext: RunRequestContext
  costEstimate: CostAssessment
}

/**
 * Start a simulation run (§5.5.1): sample a stratified persona panel, submit ONE
 * Anthropic Message Batch (Haiku, `custom_id = persona_id`, `temperature: 1.0`),
 * and insert a `simulation_runs` row (`status='running'`, `batch_id`). Returns
 * the run id + batch id. Poll later with `checkRun`.
 */
export async function startRun(input: StartRunInput): Promise<StartRunResult> {
  const isBrandPretest = input.isBrandPretest === true
  const nRequested = Math.floor(input.nAgents)
  if (!Number.isFinite(nRequested) || nRequested <= 0) {
    throw new Error('startRun: nAgents must be a positive integer')
  }
  if (nRequested > MAX_AGENTS) {
    throw new Error(
      `startRun: nAgents ${nRequested} exceeds MAX_AGENTS ${MAX_AGENTS} — refusing (§5.5 sanity)`,
    )
  }
  if (isBrandPretest) {
    if (input.marketId) {
      throw new Error('startRun: a brand pre-test must NOT reference a market_id')
    }
    if (!input.questionOverride || !input.options || input.options.length < 2) {
      throw new Error(
        'startRun: brand pre-test requires questionOverride and >= 2 options',
      )
    }
  } else if (!input.marketId) {
    throw new Error('startRun: a non-brand run requires a marketId')
  }

  const { getAnthropicClient, MODELS } = await loadConfig()
  const admin = input.adminClient ?? (await loadAdmin())

  // Resolve the exact question + options shown to the panel (what a real voter
  // sees). Market runs read metadata READ-ONLY; brand pre-tests use overrides.
  const requestContext = isBrandPretest
    ? {
        question: input.questionOverride!.trim(),
        description: (input.description ?? null),
        options: input.options!.map((o) => o.trim()),
      }
    : await readMarketSubject(admin, input.marketId!)

  // Sample the persona panel preserving the pool's marginal distribution.
  const personas = await readPersonas(admin, input.personaVersion)
  if (personas.length === 0) {
    throw new Error(
      `startRun: no personas found for version '${input.personaVersion}'`,
    )
  }
  const panel = selectStratifiedSample(personas, nRequested, personaStratumKey)
  const nAgents = panel.length

  // Pre-flight cost estimate against the §5.5 envelope (also catches an absurd
  // panel before we spend anything).
  const costEstimate = assertCostWithinEnvelope({
    nAgents,
    inputTokens: nAgents * EXPECTED_INPUT_TOKENS_PER_AGENT,
    outputTokens: nAgents * EXPECTED_OUTPUT_TOKENS_PER_AGENT,
    batch: true,
  })

  // Build ONE batch: each request is one persona voting the Pulse.
  const userPrompt = buildAgentUserPrompt({
    question: requestContext.question,
    description: requestContext.description,
    options: requestContext.options,
  })
  const requests: BatchCreateParams.Request[] = panel.map((persona) => ({
    custom_id: persona.id,
    params: {
      model: MODELS.FAST,
      max_tokens: AGENT_MAX_TOKENS,
      temperature: AGENT_TEMPERATURE,
      system: renderAgentSystemPrompt(toPromptPersona(persona)),
      messages: [{ role: 'user', content: userPrompt }],
    },
  }))

  const client = getAnthropicClient()
  const batch = await client.messages.batches.create({ requests })

  const aggregates: RunAggregates = {
    option_shares: {},
    avg_confidence_by_option: {},
    confidence_weighted_shares: {},
    completion_rate: 0,
    request_context: requestContext,
  }

  const insertRow: Database['public']['Tables']['simulation_runs']['Insert'] = {
    market_id: isBrandPretest ? null : input.marketId!,
    persona_version: input.personaVersion,
    model: MODELS.FAST,
    prompt_version: PROMPT_VERSION,
    n_agents: nAgents,
    status: 'running',
    is_brand_pretest: isBrandPretest,
    question_override: isBrandPretest ? requestContext.question : null,
    // `aggregates` is a jsonb column (typed `Json`); store the domain object.
    aggregates: aggregates as unknown as Json,
    batch_id: batch.id,
  }

  const { data, error } = await admin
    .from('simulation_runs')
    .insert(insertRow)
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(
      `startRun: failed to insert simulation_runs row (batch ${batch.id} was created): ${error?.message ?? 'no row returned'}`,
    )
  }

  const runId = data.id
  return { runId, batchId: batch.id, nAgents, requestContext, costEstimate }
}

/**
 * Convenience wrapper for backtesting an already-closed Pulse (§5.5.5): identical
 * to `startRun` but records backtest intent. After the batch completes, call
 * `checkRun` then `computeAndStoreDivergence` for an instant divergence datapoint.
 */
export async function startBacktestRun(
  marketId: string,
  input: Omit<StartRunInput, 'marketId' | 'isBrandPretest' | 'isBacktest'>,
): Promise<StartRunResult> {
  return startRun({ ...input, marketId, isBacktest: true })
}

export interface CheckRunResult {
  runId: string
  status: 'running' | 'complete'
  /** Set once processing ends. */
  completionRate?: number
  validVotes?: number
  attempted?: number
  aggregates?: RunAggregates
  cost?: CostAssessment
}

export interface CheckRunOptions {
  adminClient?: AdminClient
  /**
   * Retry each failed/unparseable agent once with a direct (non-batch) call
   * (§5.4). Defaults to true. Set false to skip network retries entirely.
   */
  retryFailed?: boolean
}

/**
 * Poll a run's batch (§5.5.2). While the batch is still processing, returns
 * `status:'running'`. Once it ends: parse each result with
 * `parseAgentVote(raw, allowedOptions)` (one direct-call retry on failure,
 * §5.4), insert valid votes into `simulation_votes` (with `raw_response`),
 * compute aggregates reusing the canonical math, enforce the cost envelope, and
 * store the aggregates with `status='complete'`.
 */
export async function checkRun(
  runId: string,
  options: CheckRunOptions = {},
): Promise<CheckRunResult> {
  const admin = options.adminClient ?? (await loadAdmin())
  const { getAnthropicClient, MODELS } = await loadConfig()

  const run = await readRun(admin, runId)
  if (run.status === 'complete') {
    return {
      runId,
      status: 'complete',
      completionRate: run.aggregates?.completion_rate,
      aggregates: run.aggregates ?? undefined,
    }
  }
  if (!run.batch_id) {
    throw new Error(`checkRun: run ${runId} has no batch_id`)
  }

  const client = getAnthropicClient()
  const batch = await client.messages.batches.retrieve(run.batch_id)
  if (batch.processing_status !== 'ended') {
    return { runId, status: 'running' }
  }

  const allowedOptions = await resolveAllowedOptions(admin, run)
  if (allowedOptions.length === 0) {
    throw new Error(
      `checkRun: run ${runId} has no resolvable options to validate votes against`,
    )
  }

  // Parse every result. Track token usage for the cost guard and remember which
  // personas need a retry (§5.4).
  const validVotes: {
    persona_id: string
    option_chosen: string
    confidence: number
    reasoning_es: string
    raw_response: unknown
  }[] = []
  const needsRetry: string[] = []
  let attempted = 0
  let inputTokens = 0
  let outputTokens = 0

  const results = await client.messages.batches.results(run.batch_id)
  for await (const item of results) {
    attempted++
    const personaId = item.custom_id
    if (item.result.type === 'succeeded') {
      const message = item.result.message
      inputTokens += message.usage?.input_tokens ?? 0
      outputTokens += message.usage?.output_tokens ?? 0
      const text = extractMessageText(message)
      const parsed = parseAgentVote(text, allowedOptions)
      if (parsed.ok) {
        validVotes.push({
          persona_id: personaId,
          option_chosen: parsed.vote.option,
          confidence: parsed.vote.confidence,
          reasoning_es: parsed.vote.reasoning_es,
          raw_response: message,
        })
      } else {
        needsRetry.push(personaId)
      }
    } else {
      // errored | canceled | expired — a failed attempt eligible for one retry.
      needsRetry.push(personaId)
    }
  }

  // One direct-call retry per failed agent (§5.4), best-effort.
  if (options.retryFailed !== false && needsRetry.length > 0) {
    const retry = await retryFailedAgents({
      client,
      model: MODELS.FAST,
      admin,
      run,
      allowedOptions,
      personaIds: needsRetry,
    })
    validVotes.push(...retry.votes)
    inputTokens += retry.inputTokens
    outputTokens += retry.outputTokens
  }

  // Cost guard on OBSERVED usage (§5.5): stop and flag if ~10× the envelope.
  const assessment = assessRunCost({
    nAgents: attempted || run.n_agents,
    inputTokens,
    outputTokens,
    batch: true,
  })
  if (!assessment.withinEnvelope) {
    await admin
      .from('simulation_runs')
      .update({ status: 'failed' })
      .eq('id', runId)
    throw new CostEnvelopeError(assessment)
  }

  // Persist valid votes (audit trail includes the raw model response).
  if (validVotes.length > 0) {
    const voteRows: SimulationVoteInsert[] = validVotes.map((v) => ({
      run_id: runId,
      persona_id: v.persona_id,
      option_chosen: v.option_chosen,
      confidence: v.confidence,
      reasoning_es: v.reasoning_es,
      // `raw_response` is a jsonb column (typed `Json`); persist the raw message.
      raw_response: v.raw_response as Json,
    }))
    const { error: voteErr } = await admin.from('simulation_votes').insert(voteRows)
    if (voteErr) {
      throw new Error(`checkRun: failed to insert simulation_votes: ${voteErr.message}`)
    }
  }

  const aggregates = computeRunAggregates(validVotes, attempted || run.n_agents)
  // Preserve the request context for audit / later synthesis.
  aggregates.request_context = run.aggregates?.request_context

  const { error: updErr } = await admin
    .from('simulation_runs')
    // `aggregates` is a jsonb column (typed `Json`); store the domain object.
    .update({ aggregates: aggregates as unknown as Json, status: 'complete' })
    .eq('id', runId)
  if (updErr) {
    throw new Error(`checkRun: failed to store aggregates: ${updErr.message}`)
  }

  return {
    runId,
    status: 'complete',
    completionRate: aggregates.completion_rate,
    validVotes: validVotes.length,
    attempted: attempted || run.n_agents,
    aggregates,
    cost: assessment,
  }
}

export interface DivergenceStoreOptions {
  adminClient?: AdminClient
  /**
   * Provide real votes directly (already mapped to `{ outcome_label, confidence }`)
   * to bypass the DB read — handy for an admin fallback or tests.
   */
  realVotesOverride?: { option_chosen: string; confidence: number | null }[]
}

/**
 * Compute + store the Divergence Index for a completed run against the REAL
 * Pulse aggregates (§5.5.3 / §5.6). Called on real Pulse close (by the
 * `pulse-auto-resolve` cron — NOT wired here) or as a manual admin fallback.
 *
 * The real snapshot is built from `market_votes` using the SAME canonical math
 * as the sim side (§1.5), keyed by option label so the two snapshots align.
 * READ-ONLY on all real tables. Returns the stored `DivergenceResult`.
 */
export async function computeAndStoreDivergence(
  runId: string,
  options: DivergenceStoreOptions = {},
): Promise<ReturnType<typeof computeDivergence>> {
  const admin = options.adminClient ?? (await loadAdmin())
  const run = await readRun(admin, runId)

  if (!run.aggregates) {
    throw new Error(`computeAndStoreDivergence: run ${runId} has no aggregates yet`)
  }
  if (!run.market_id && !options.realVotesOverride) {
    throw new Error(
      `computeAndStoreDivergence: run ${runId} has no market_id (brand pre-tests have no real Pulse to compare)`,
    )
  }

  const realSnapshot = options.realVotesOverride
    ? computeAggregateSnapshot(
        options.realVotesOverride.map((v) => ({
          outcome_id: v.option_chosen,
          confidence: v.confidence,
          created_at: EPOCH_ISO,
        })),
      )
    : await readRealAggregateSnapshot(admin, run.market_id!)

  const divergence = computeDivergence(
    toAggregateSnapshot(realSnapshot),
    toAggregateSnapshot(run.aggregates),
  )

  const { error } = await admin
    .from('simulation_runs')
    // `divergence` is a jsonb column (typed `Json`); store the domain object.
    .update({ divergence: divergence as unknown as Json })
    .eq('id', runId)
  if (error) {
    throw new Error(`computeAndStoreDivergence: failed to store divergence: ${error.message}`)
  }
  return divergence
}

/** Strict-JSON synthesis output (§5.4). */
export interface SynthesisResult {
  resumen_es: string
  resumen_en: string
  divergencias_clave: string[]
  hipotesis_divergencia: string
  cita_sim_representativa: string
  angulo_contenido: string
}

export interface RunSynthesisOptions {
  adminClient?: AdminClient
  /** Include real aggregates in the prompt (Pulse closed). Defaults to auto. */
  includeReal?: boolean
}

/**
 * Optional per-run synthesis (§5.5.4 / §5.4): ONE `MODELS.CREATIVE` (Sonnet)
 * call over the run's aggregates + up to 30 reasonings stratified by option
 * (+ real aggregates once the Pulse closed), stored to `aggregates.synthesis`.
 */
export async function runSynthesis(
  runId: string,
  options: RunSynthesisOptions = {},
): Promise<SynthesisResult> {
  const admin = options.adminClient ?? (await loadAdmin())
  const { getAnthropicClient, MODELS } = await loadConfig()

  const run = await readRun(admin, runId)
  if (!run.aggregates) {
    throw new Error(`runSynthesis: run ${runId} has no aggregates yet`)
  }
  const question =
    run.aggregates.request_context?.question ??
    (run.market_id ? (await readMarketSubject(admin, run.market_id)).question : '')

  const sampledReasonings = await sampleReasoningsByOption(
    admin,
    runId,
    MAX_SYNTHESIS_REASONINGS,
  )

  let realAggregates: SynthesisRealAggregates | null = null
  const wantReal = options.includeReal ?? Boolean(run.market_id)
  if (wantReal && run.market_id) {
    const realSnapshot = await readRealAggregateSnapshot(admin, run.market_id)
    if (Object.keys(realSnapshot.option_shares).length > 0) {
      realAggregates = {
        option_shares: realSnapshot.option_shares,
        avg_confidence_by_option: realSnapshot.avg_confidence_by_option,
      }
    }
  }

  const userPrompt = buildSynthesisUserPrompt({
    question,
    simAggregates: {
      option_shares: run.aggregates.option_shares,
      avg_confidence_by_option: run.aggregates.avg_confidence_by_option,
      completion_rate: run.aggregates.completion_rate,
    },
    sampledReasonings,
    realAggregates,
  })

  const client = getAnthropicClient()
  const message = await client.messages.create({
    model: MODELS.CREATIVE,
    max_tokens: SYNTHESIS_MAX_TOKENS,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const synthesis = parseSynthesis(extractMessageText(message))

  const nextAggregates: RunAggregates = { ...run.aggregates, synthesis }
  const { error } = await admin
    .from('simulation_runs')
    // `aggregates` is a jsonb column (typed `Json`); store the domain object.
    .update({ aggregates: nextAggregates as unknown as Json })
    .eq('id', runId)
  if (error) {
    throw new Error(`runSynthesis: failed to store synthesis: ${error.message}`)
  }
  return synthesis
}

type SynthesisRealAggregates = {
  option_shares: Record<string, number>
  avg_confidence_by_option: Record<string, number>
}

// ---------------------------------------------------------------------------
// Internal helpers (impure DB / SDK glue)
// ---------------------------------------------------------------------------

function toPromptPersona(p: SimulationPersonaRow): PromptPersona {
  return {
    age: p.age,
    gender: p.gender,
    colonia: p.colonia,
    alcaldia: p.alcaldia,
    occupation: p.occupation,
    education: p.education,
    income_band: p.income_band,
    transport_mode: p.transport_mode,
    media_diet: p.media_diet,
    persona_narrative: p.persona_narrative,
  }
}

/** Concatenate the text blocks of a Message into one string. */
function extractMessageText(message: Message): string {
  if (!message?.content) return ''
  return message.content
    .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim()
}

async function readPersonas(
  admin: AdminClient,
  version: string,
): Promise<SimulationPersonaRow[]> {
  const { data, error } = await admin
    .from('simulation_personas')
    .select('*')
    .eq('version', version)
  if (error) throw new Error(`readPersonas: ${error.message}`)
  return data ?? []
}

async function readRun(admin: AdminClient, runId: string): Promise<SimulationRunRow> {
  const { data, error } = await admin
    .from('simulation_runs')
    .select('*')
    .eq('id', runId)
    .single()
  if (error || !data) {
    throw new Error(`readRun: run ${runId} not found${error ? `: ${error.message}` : ''}`)
  }
  // `aggregates`/`divergence` are jsonb columns (typed `Json`); narrow them to
  // their domain shapes. Everything else flows from the generated row type.
  return {
    ...data,
    aggregates: data.aggregates as unknown as RunAggregates | null,
    divergence: data.divergence as unknown as DivergenceResult | null,
  }
}

/** Read a market's question/description/options (READ-ONLY). */
async function readMarketSubject(
  admin: AdminClient,
  marketId: string,
): Promise<RunRequestContext> {
  const { data: market, error: mErr } = await admin
    .from('prediction_markets')
    .select('title, description')
    .eq('id', marketId)
    .single()
  if (mErr || !market) {
    throw new Error(`readMarketSubject: market ${marketId} not found${mErr ? `: ${mErr.message}` : ''}`)
  }
  const { data: outcomes, error: oErr } = await admin
    .from('market_outcomes')
    .select('label, sort_order')
    .eq('market_id', marketId)
    .order('sort_order', { ascending: true })
  if (oErr) throw new Error(`readMarketSubject: outcomes: ${oErr.message}`)
  const options = (outcomes ?? [])
    .map((o) => (o as { label: string }).label)
    .filter((l): l is string => typeof l === 'string' && l.length > 0)
  if (options.length < 2) {
    throw new Error(`readMarketSubject: market ${marketId} has < 2 outcomes`)
  }
  const m = market as { title: string; description: string | null }
  return { question: m.title, description: m.description ?? null, options }
}

/** Allowed options for vote validation: request_context, else re-read the market. */
async function resolveAllowedOptions(
  admin: AdminClient,
  run: SimulationRunRow,
): Promise<string[]> {
  const fromContext = run.aggregates?.request_context?.options
  if (fromContext && fromContext.length > 0) return fromContext
  if (run.market_id) {
    return (await readMarketSubject(admin, run.market_id)).options
  }
  return []
}

/**
 * Build the REAL Pulse aggregate snapshot from `market_votes`, keyed by option
 * LABEL (mapping `outcome_id → label` via `market_outcomes`) so it aligns with
 * the sim snapshot. Uses the canonical `computeAggregateSnapshot` math (§1.5).
 * READ-ONLY.
 */
async function readRealAggregateSnapshot(
  admin: AdminClient,
  marketId: string,
): Promise<ReturnType<typeof computeAggregateSnapshot>> {
  const { data: outcomes, error: oErr } = await admin
    .from('market_outcomes')
    .select('id, label')
    .eq('market_id', marketId)
  if (oErr) throw new Error(`readRealAggregateSnapshot: outcomes: ${oErr.message}`)
  const labelById = new Map<string, string>()
  for (const o of outcomes ?? []) {
    const row = o as { id: string; label: string }
    labelById.set(row.id, row.label)
  }

  const { data: votes, error: vErr } = await admin
    .from('market_votes')
    .select('outcome_id, confidence, created_at')
    .eq('market_id', marketId)
  if (vErr) throw new Error(`readRealAggregateSnapshot: votes: ${vErr.message}`)

  const pulseVotes: PulseVoteLike[] = (votes ?? []).map((v) => {
    const row = v as { outcome_id: string; confidence: number | null; created_at: string }
    return {
      outcome_id: labelById.get(row.outcome_id) ?? row.outcome_id,
      confidence: row.confidence,
      created_at: row.created_at,
    }
  })
  return computeAggregateSnapshot(pulseVotes)
}

/** Up to `limit` reasonings, stratified as evenly as possible across options. */
async function sampleReasoningsByOption(
  admin: AdminClient,
  runId: string,
  limit: number,
): Promise<SampledReasoning[]> {
  const { data, error } = await admin
    .from('simulation_votes')
    .select('option_chosen, confidence, reasoning_es')
    .eq('run_id', runId)
  if (error) throw new Error(`sampleReasoningsByOption: ${error.message}`)

  const byOption = new Map<string, SampledReasoning[]>()
  for (const v of data ?? []) {
    const row = v as { option_chosen: string; confidence: number; reasoning_es: string | null }
    if (!row.reasoning_es) continue
    const bucket = byOption.get(row.option_chosen)
    const entry: SampledReasoning = {
      option: row.option_chosen,
      confidence: row.confidence,
      reasoning_es: row.reasoning_es,
    }
    if (bucket) bucket.push(entry)
    else byOption.set(row.option_chosen, [entry])
  }

  // Round-robin across options so the sample is stratified, not option-1-heavy.
  const out: SampledReasoning[] = []
  const buckets = [...byOption.values()]
  let idx = 0
  while (out.length < limit && buckets.some((b) => b.length > 0)) {
    const bucket = buckets[idx % buckets.length]
    const next = bucket.shift()
    if (next) out.push(next)
    idx++
  }
  return out
}

interface RetryArgs {
  client: AnthropicClient
  model: string
  admin: AdminClient
  run: SimulationRunRow
  allowedOptions: string[]
  personaIds: string[]
}

/**
 * §5.4 retry: one direct (non-batch) call per failed agent. Re-fetches the
 * needed persona rows, re-renders the prompt, and parses once more. Failures
 * are simply dropped (they count against `completion_rate`).
 */
async function retryFailedAgents(args: RetryArgs): Promise<{
  votes: {
    persona_id: string
    option_chosen: string
    confidence: number
    reasoning_es: string
    raw_response: unknown
  }[]
  inputTokens: number
  outputTokens: number
}> {
  const { client, model, admin, run, allowedOptions, personaIds } = args
  const votes: {
    persona_id: string
    option_chosen: string
    confidence: number
    reasoning_es: string
    raw_response: unknown
  }[] = []
  let inputTokens = 0
  let outputTokens = 0

  const { data, error } = await admin
    .from('simulation_personas')
    .select('*')
    .in('id', personaIds)
  if (error) return { votes, inputTokens, outputTokens }
  const personaById = new Map<string, SimulationPersonaRow>()
  for (const p of data ?? []) {
    personaById.set(p.id, p)
  }

  const ctx = run.aggregates?.request_context
  if (!ctx) return { votes, inputTokens, outputTokens }
  const userPrompt = buildAgentUserPrompt({
    question: ctx.question,
    description: ctx.description,
    options: ctx.options,
  })

  for (const personaId of personaIds) {
    const persona = personaById.get(personaId)
    if (!persona) continue
    try {
      const message = await client.messages.create({
        model,
        max_tokens: AGENT_MAX_TOKENS,
        temperature: AGENT_TEMPERATURE,
        system: renderAgentSystemPrompt(toPromptPersona(persona)),
        messages: [{ role: 'user', content: userPrompt }],
      })
      inputTokens += message.usage?.input_tokens ?? 0
      outputTokens += message.usage?.output_tokens ?? 0
      const parsed = parseAgentVote(extractMessageText(message), allowedOptions)
      if (parsed.ok) {
        votes.push({
          persona_id: personaId,
          option_chosen: parsed.vote.option,
          confidence: parsed.vote.confidence,
          reasoning_es: parsed.vote.reasoning_es,
          raw_response: message,
        })
      }
    } catch {
      // Best-effort: a failed retry just lowers completion_rate.
    }
  }

  return { votes, inputTokens, outputTokens }
}

/** Parse + validate the strict-JSON synthesis output (§5.4). */
function parseSynthesis(raw: string): SynthesisResult {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z0-9]*\s*\n?/, '').replace(/\n?```$/, '').trim()
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('runSynthesis: model did not return valid JSON')
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('runSynthesis: synthesis is not a JSON object')
  }
  const o = parsed as Record<string, unknown>
  const asString = (v: unknown): string => (typeof v === 'string' ? v : '')
  const divergencias = Array.isArray(o.divergencias_clave)
    ? o.divergencias_clave.filter((x): x is string => typeof x === 'string')
    : []
  return {
    resumen_es: asString(o.resumen_es),
    resumen_en: asString(o.resumen_en),
    divergencias_clave: divergencias,
    hipotesis_divergencia: asString(o.hipotesis_divergencia),
    cita_sim_representativa: asString(o.cita_sim_representativa),
    angulo_contenido: asString(o.angulo_contenido),
  }
}
