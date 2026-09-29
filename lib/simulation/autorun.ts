/**
 * Pulse Simulation auto-run — queue helpers + worker steps.
 *
 * Design: enqueue on publish/create (never blocks the user), process via
 * Vercel cron. One job row per Pulse (UNIQUE market_id); re-run resets it.
 * Gated by SIM_AUTORUN_ENABLED; concurrency + hourly start caps protect cost.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type AutorunJobStatus = 'queued' | 'running' | 'complete' | 'failed'
export type AutorunJobSource = 'auto' | 'backfill' | 'rerun'

export type AutorunJobRow = {
  id: string
  market_id: string
  status: AutorunJobStatus
  simulation_run_id: string | null
  source: AutorunJobSource
  attempts: number
  max_attempts: number
  last_error: string | null
  next_attempt_at: string
  cost_usd: number | null
  input_tokens: number | null
  output_tokens: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Untyped admin client is fine — createAdminClient() is service-role without
// generics; we only need .from().insert/update/select.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any>

const DEFAULT_N_AGENTS = 150
const DEFAULT_PERSONA_VERSION = 'cdmx-v1'
const DEFAULT_MAX_CONCURRENT = 2
const DEFAULT_MAX_PER_HOUR = 10
const DEFAULT_MAX_ATTEMPTS = 3
/** Backoff base (seconds) × 2^(attempts-1), capped. */
const RETRY_BASE_SECONDS = 60
const RETRY_MAX_SECONDS = 30 * 60

export function isSimAutorunEnabled(): boolean {
  return process.env.SIM_AUTORUN_ENABLED === 'true'
}

export function simAutorunNAgents(): number {
  const raw = process.env.SIM_AUTORUN_N_AGENTS
  if (!raw) return DEFAULT_N_AGENTS
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_N_AGENTS
}

export function simAutorunPersonaVersion(): string {
  const raw = process.env.SIM_AUTORUN_PERSONA_VERSION
  return raw && raw.trim().length > 0 ? raw.trim() : DEFAULT_PERSONA_VERSION
}

export function simAutorunMaxConcurrent(): number {
  const raw = process.env.SIM_AUTORUN_MAX_CONCURRENT
  if (!raw) return DEFAULT_MAX_CONCURRENT
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_CONCURRENT
}

export function simAutorunMaxPerHour(): number {
  const raw = process.env.SIM_AUTORUN_MAX_PER_HOUR
  if (!raw) return DEFAULT_MAX_PER_HOUR
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_PER_HOUR
}

export function retryDelaySeconds(attemptsAfterFail: number): number {
  const exp = Math.max(0, attemptsAfterFail - 1)
  const seconds = RETRY_BASE_SECONDS * Math.pow(2, exp)
  return Math.min(RETRY_MAX_SECONDS, seconds)
}

/**
 * Idempotent enqueue. Inserts a queued job if none exists for this Pulse.
 * Does NOT reset an existing complete/failed/running row — use `rerunAutorunJob`
 * for that. Safe to call fire-and-forget from publish/create.
 */
export async function enqueueAutorunJob(
  admin: AdminClient,
  marketId: string,
  source: AutorunJobSource = 'auto',
): Promise<{ enqueued: boolean; jobId?: string; reason?: string }> {
  if (!marketId) return { enqueued: false, reason: 'missing_market_id' }

  const { data: market } = await admin
    .from('prediction_markets')
    .select('id, is_pulse, vote_mode')
    .eq('id', marketId)
    .maybeSingle()

  if (!market || !(market as { is_pulse?: boolean }).is_pulse) {
    return { enqueued: false, reason: 'not_a_pulse' }
  }
  if ((market as { vote_mode?: string }).vote_mode === 'multi') {
    return { enqueued: false, reason: 'multi_select_unsupported' }
  }

  const { data: existing } = await admin
    .from('simulation_autorun_jobs')
    .select('id, status')
    .eq('market_id', marketId)
    .maybeSingle()

  if (existing) {
    return { enqueued: false, jobId: existing.id, reason: 'already_exists' }
  }

  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('simulation_autorun_jobs')
    .insert({
      market_id: marketId,
      status: 'queued',
      source,
      attempts: 0,
      max_attempts: DEFAULT_MAX_ATTEMPTS,
      next_attempt_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (error) {
    // Race: another enqueue won the UNIQUE — treat as already exists.
    if (error.code === '23505') {
      return { enqueued: false, reason: 'already_exists' }
    }
    throw new Error(`enqueueAutorunJob: ${error.message}`)
  }

  return { enqueued: true, jobId: data.id }
}

/**
 * Fire-and-forget wrapper for publish/create paths. Never throws to the caller.
 * No-ops when SIM_AUTORUN_ENABLED is off.
 */
export function enqueueAutorunJobFireAndForget(
  admin: AdminClient,
  marketId: string,
  source: AutorunJobSource = 'auto',
): void {
  if (!isSimAutorunEnabled()) return
  void enqueueAutorunJob(admin, marketId, source).catch((err) => {
    console.warn(
      '[sim-autorun] enqueue failed',
      marketId,
      err instanceof Error ? err.message : String(err),
    )
  })
}

/**
 * Admin re-run: reset the job to queued (or insert if missing). Explicitly
 * allowed even when a prior auto run completed.
 */
export async function rerunAutorunJob(
  admin: AdminClient,
  marketId: string,
): Promise<{ jobId: string }> {
  const now = new Date().toISOString()
  const { data: existing } = await admin
    .from('simulation_autorun_jobs')
    .select('id')
    .eq('market_id', marketId)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('simulation_autorun_jobs')
      .update({
        status: 'queued',
        source: 'rerun',
        simulation_run_id: null,
        attempts: 0,
        last_error: null,
        next_attempt_at: now,
        cost_usd: null,
        input_tokens: null,
        output_tokens: null,
        started_at: null,
        completed_at: null,
        updated_at: now,
      })
      .eq('id', existing.id)
    if (error) throw new Error(`rerunAutorunJob: ${error.message}`)
    return { jobId: existing.id }
  }

  const { data, error } = await admin
    .from('simulation_autorun_jobs')
    .insert({
      market_id: marketId,
      status: 'queued',
      source: 'rerun',
      attempts: 0,
      max_attempts: DEFAULT_MAX_ATTEMPTS,
      next_attempt_at: now,
      updated_at: now,
    })
    .select('id')
    .single()
  if (error || !data) {
    throw new Error(`rerunAutorunJob insert: ${error?.message ?? 'no row'}`)
  }
  return { jobId: data.id }
}

/**
 * Discover open, published, single-select Pulses that have no autorun job yet
 * and enqueue them as `backfill`. Idempotent via UNIQUE(market_id).
 */
export async function backfillOpenPulseAutorunJobs(
  admin: AdminClient,
  limit = 50,
): Promise<{ scanned: number; enqueued: number }> {
  const { data: openPulses, error } = await admin
    .from('prediction_markets')
    .select('id, vote_mode')
    .eq('is_pulse', true)
    .eq('is_draft', false)
    .in('status', ['active', 'trading'])
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`backfillOpenPulseAutorunJobs: ${error.message}`)

  const candidates = (openPulses ?? []).filter(
    (p) => (p as { vote_mode?: string }).vote_mode !== 'multi',
  )
  if (candidates.length === 0) return { scanned: 0, enqueued: 0 }

  const ids = candidates.map((p) => p.id as string)
  const { data: existingJobs } = await admin
    .from('simulation_autorun_jobs')
    .select('market_id')
    .in('market_id', ids)

  const have = new Set((existingJobs ?? []).map((j) => j.market_id as string))
  let enqueued = 0
  for (const id of ids) {
    if (have.has(id)) continue
    const result = await enqueueAutorunJob(admin, id, 'backfill')
    if (result.enqueued) enqueued++
  }
  return { scanned: candidates.length, enqueued }
}

export async function countRunningAutorunJobs(
  admin: AdminClient,
): Promise<number> {
  const { count, error } = await admin
    .from('simulation_autorun_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'running')
  if (error) throw new Error(`countRunningAutorunJobs: ${error.message}`)
  return count ?? 0
}

/** Jobs that transitioned to running (started) in the last hour. */
export async function countStartsInLastHour(
  admin: AdminClient,
): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await admin
    .from('simulation_autorun_jobs')
    .select('id', { count: 'exact', head: true })
    .gte('started_at', since)
  if (error) throw new Error(`countStartsInLastHour: ${error.message}`)
  return count ?? 0
}

export async function claimQueuedAutorunJobs(
  admin: AdminClient,
  limit: number,
): Promise<AutorunJobRow[]> {
  if (limit <= 0) return []
  const now = new Date().toISOString()

  const { data: candidates, error } = await admin
    .from('simulation_autorun_jobs')
    .select('*')
    .eq('status', 'queued')
    .lte('next_attempt_at', now)
    .order('next_attempt_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`claimQueuedAutorunJobs: ${error.message}`)
  if (!candidates || candidates.length === 0) return []

  const claimed: AutorunJobRow[] = []
  for (const row of candidates) {
    const job = row as unknown as AutorunJobRow
    // Optimistic claim: only transition if still queued.
    const { data: updated, error: upErr } = await admin
      .from('simulation_autorun_jobs')
      .update({
        status: 'running',
        started_at: now,
        updated_at: now,
        last_error: null,
      })
      .eq('id', job.id)
      .eq('status', 'queued')
      .select('*')
      .maybeSingle()

    if (upErr) {
      console.warn('[sim-autorun] claim failed', job.id, upErr.message)
      continue
    }
    if (updated) claimed.push(updated as unknown as AutorunJobRow)
  }
  return claimed
}

export async function listPollableRunningJobs(
  admin: AdminClient,
  limit = 20,
): Promise<AutorunJobRow[]> {
  const { data, error } = await admin
    .from('simulation_autorun_jobs')
    .select('*')
    .eq('status', 'running')
    .not('simulation_run_id', 'is', null)
    .order('started_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`listPollableRunningJobs: ${error.message}`)
  return (data ?? []) as unknown as AutorunJobRow[]
}

export async function markJobStartedWithRun(
  admin: AdminClient,
  jobId: string,
  simulationRunId: string,
): Promise<void> {
  const now = new Date().toISOString()
  const { data: row } = await admin
    .from('simulation_autorun_jobs')
    .select('attempts')
    .eq('id', jobId)
    .maybeSingle()

  const attempts = ((row as { attempts?: number } | null)?.attempts ?? 0) + 1
  const { error } = await admin
    .from('simulation_autorun_jobs')
    .update({
      simulation_run_id: simulationRunId,
      attempts,
      updated_at: now,
      status: 'running',
    })
    .eq('id', jobId)

  if (error) {
    throw new Error(`markJobStartedWithRun: ${error.message}`)
  }
}

export async function markJobComplete(
  admin: AdminClient,
  jobId: string,
  cost?: {
    costUsd: number
    inputTokens: number
    outputTokens: number
  },
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await admin
    .from('simulation_autorun_jobs')
    .update({
      status: 'complete',
      completed_at: now,
      updated_at: now,
      last_error: null,
      cost_usd: cost?.costUsd ?? null,
      input_tokens: cost?.inputTokens ?? null,
      output_tokens: cost?.outputTokens ?? null,
    })
    .eq('id', jobId)
  if (error) throw new Error(`markJobComplete: ${error.message}`)
}

/**
 * On failure: re-queue with backoff if attempts remain, else mark failed.
 * `attemptsSoFar` is the count AFTER this failed try.
 */
export async function markJobFailedOrRetry(
  admin: AdminClient,
  job: Pick<AutorunJobRow, 'id' | 'attempts' | 'max_attempts'>,
  errorMessage: string,
): Promise<'queued' | 'failed'> {
  const now = new Date()
  const attemptsSoFar = job.attempts
  const canRetry = attemptsSoFar < job.max_attempts
  const delay = retryDelaySeconds(attemptsSoFar)
  const nextAt = new Date(now.getTime() + delay * 1000).toISOString()

  if (canRetry) {
    const { error } = await admin
      .from('simulation_autorun_jobs')
      .update({
        status: 'queued',
        simulation_run_id: null,
        last_error: errorMessage.slice(0, 2000),
        next_attempt_at: nextAt,
        updated_at: now.toISOString(),
        started_at: null,
      })
      .eq('id', job.id)
    if (error) throw new Error(`markJobFailedOrRetry requeue: ${error.message}`)
    return 'queued'
  }

  const { error } = await admin
    .from('simulation_autorun_jobs')
    .update({
      status: 'failed',
      last_error: errorMessage.slice(0, 2000),
      completed_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', job.id)
  if (error) throw new Error(`markJobFailedOrRetry fail: ${error.message}`)
  return 'failed'
}

/**
 * Start a simulation for a claimed job. Returns the new run id.
 * Caller must have already claimed the job (status=running).
 */
export async function startAutorunSimulation(
  admin: AdminClient,
  marketId: string,
): Promise<{ runId: string; nAgents: number; costEstimateUsd: number }> {
  const { startRun } = await import('@/lib/simulation/run')
  const result = await startRun({
    marketId,
    personaVersion: simAutorunPersonaVersion(),
    nAgents: simAutorunNAgents(),
    adminClient: admin,
  })
  return {
    runId: result.runId,
    nAgents: result.nAgents,
    costEstimateUsd: result.costEstimate.expectedCostUsd,
  }
}

/**
 * Poll a running autorun job's Anthropic batch. Returns the check status.
 */
export async function pollAutorunSimulation(
  admin: AdminClient,
  runId: string,
): Promise<{
  status: 'running' | 'complete'
  costUsd?: number
  inputTokens?: number
  outputTokens?: number
}> {
  const { checkRun } = await import('@/lib/simulation/run')
  const result = await checkRun(runId, { adminClient: admin })
  if (result.status === 'running') return { status: 'running' }

  return {
    status: 'complete',
    costUsd: result.cost?.observedCostUsd,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  }
}

/** Process one cron tick. Returns a summary for cron_job_runs. */
export async function processAutorunCronTick(admin: AdminClient): Promise<{
  enabled: boolean
  backfillEnqueued: number
  polled: number
  completed: number
  started: number
  failed: number
  retried: number
  skippedCap: boolean
}> {
  if (!isSimAutorunEnabled()) {
    return {
      enabled: false,
      backfillEnqueued: 0,
      polled: 0,
      completed: 0,
      started: 0,
      failed: 0,
      retried: 0,
      skippedCap: false,
    }
  }

  const backfill = await backfillOpenPulseAutorunJobs(admin, 50)

  let polled = 0
  let completed = 0
  let started = 0
  let failed = 0
  let retried = 0

  // 1) Poll in-flight runs.
  const running = await listPollableRunningJobs(admin)
  for (const job of running) {
    if (!job.simulation_run_id) continue
    polled++
    try {
      const result = await pollAutorunSimulation(admin, job.simulation_run_id)
      if (result.status === 'complete') {
        await markJobComplete(admin, job.id, {
          costUsd: result.costUsd ?? 0,
          inputTokens: result.inputTokens ?? 0,
          outputTokens: result.outputTokens ?? 0,
        })
        completed++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[sim-autorun] poll failed', job.id, msg)
      const attempts = job.attempts + 1
      await admin
        .from('simulation_autorun_jobs')
        .update({ attempts, updated_at: new Date().toISOString() })
        .eq('id', job.id)
      const outcome = await markJobFailedOrRetry(
        admin,
        { id: job.id, attempts, max_attempts: job.max_attempts },
        msg,
      )
      if (outcome === 'failed') failed++
      else retried++
    }
  }

  // 2) Start new queued jobs within caps.
  const maxConcurrent = simAutorunMaxConcurrent()
  const maxPerHour = simAutorunMaxPerHour()
  const currentlyRunning = await countRunningAutorunJobs(admin)
  const startedLastHour = await countStartsInLastHour(admin)
  const concurrentSlots = Math.max(0, maxConcurrent - currentlyRunning)
  const hourlySlots = Math.max(0, maxPerHour - startedLastHour)
  const slots = Math.min(concurrentSlots, hourlySlots)
  const skippedCap = slots === 0 && concurrentSlots + hourlySlots === 0

  if (slots > 0) {
    const claimed = await claimQueuedAutorunJobs(admin, slots)
    for (const job of claimed) {
      try {
        const { runId } = await startAutorunSimulation(admin, job.market_id)
        await markJobStartedWithRun(admin, job.id, runId)
        started++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn('[sim-autorun] start failed', job.id, msg)
        // attempts was not incremented yet — bump then decide retry.
        const attempts = job.attempts + 1
        await admin
          .from('simulation_autorun_jobs')
          .update({ attempts, updated_at: new Date().toISOString() })
          .eq('id', job.id)
        const outcome = await markJobFailedOrRetry(
          admin,
          { id: job.id, attempts, max_attempts: job.max_attempts },
          msg,
        )
        if (outcome === 'failed') failed++
        else retried++
      }
    }
  }

  return {
    enabled: true,
    backfillEnqueued: backfill.enqueued,
    polled,
    completed,
    started,
    failed,
    retried,
    skippedCap,
  }
}
