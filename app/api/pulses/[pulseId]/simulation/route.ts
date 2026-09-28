/**
 * GET /api/pulses/[pulseId]/simulation — Visor de simulación Task 2.
 *
 * Sole read path for simulation_runs / simulation_votes (RLS stays
 * service-role only; this handler uses createAdminClient after the
 * access gate). Never writes to real vote / confidence / señal tables.
 *
 * Access gate (404, never 403):
 *   - Flag NEXT_PUBLIC_SIM_VIEWER_ENABLED must be true
 *   - Non-admin: only when status=resolved AND run.revealed_at set AND
 *     SIM_VIEWER_PUBLIC_CLOSED is not 'false' (default ON = public on closed)
 *     AND run is not a fixture
 *   - Admin (profiles.user_type === 'admin' | ADMIN_EMAIL): always
 */

import { NextResponse } from 'next/server'

import { getCurrentUser, AuthSessionExpiredError } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { isSimViewerEnabled } from '@/lib/sim-viewer-flag'
import { decideReplayAccess } from '@/lib/sim-viewer/access'
import {
  buildReplayPayload,
  type ReplayOutcomeRow,
  type ReplayPersonaRow,
  type ReplayPulseRow,
  type ReplayRunRow,
  type ReplayVoteRow,
} from '@/lib/sim-viewer/build-replay'
import { isSimViewerPublicClosedEnabled } from '@/lib/sim-viewer/public-closed-flag'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ pulseId: string }> }

const NOT_FOUND = NextResponse.json({ error: 'Not found' }, { status: 404 })

const PUBLIC_CACHE =
  'public, s-maxage=86400, stale-while-revalidate=604800, max-age=0'
const PRIVATE_NO_STORE = 'private, no-store'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

async function resolveIsAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    return isAdminUser(user)
  } catch (err) {
    // Expired / invalid session → treat as anonymous (404, not 401).
    if (err instanceof AuthSessionExpiredError) return false
    return false
  }
}

export async function GET(req: Request, ctx: Ctx) {
  if (!isSimViewerEnabled()) {
    return NOT_FOUND
  }

  const { pulseId } = await ctx.params
  if (!pulseId || !isUuid(pulseId)) {
    return NOT_FOUND
  }

  const url = new URL(req.url)
  const runIdParam = url.searchParams.get('runId')
  const includeRealParam = url.searchParams.get('includeReal') === '1'

  if (runIdParam && !isUuid(runIdParam)) {
    return NOT_FOUND
  }

  const isAdmin = await resolveIsAdmin()
  const admin = createAdminClient()

  // Pulse row — read only. No writes to prediction_markets.
  const { data: pulseRaw, error: pulseErr } = await admin
    .from('prediction_markets')
    .select('id, title, resolution_date, status, total_votes, is_pulse, category, market_type')
    .eq('id', pulseId)
    .maybeSingle()

  if (pulseErr || !pulseRaw) {
    return NOT_FOUND
  }

  const pulseRow = pulseRaw as ReplayPulseRow & {
    total_votes: number | null
    is_pulse: boolean | null
    category: string | null
    market_type: string | null
  }

  const legacyPulse =
    !pulseRow.is_pulse &&
    pulseRow.category !== 'pulse' &&
    pulseRow.market_type === 'multi' &&
    pulseRow.category === 'government'

  const showPulse =
    pulseRow.is_pulse === true ||
    pulseRow.category === 'pulse' ||
    legacyPulse

  if (!showPulse) {
    return NOT_FOUND
  }

  // Most recent complete run, or explicit runId. Service-role read only.
  // `divergence` is the pre-266 B-pipeline jsonb; used when divergence_index /
  // divergence_meta are null (legacy read-time path).
  let runQuery = admin
    .from('simulation_runs')
    .select(
      'id, market_id, status, mode, model, n_agents, completed_at, divergence_index, divergence_meta, divergence, is_fixture, revealed_at, created_at, is_brand_pretest',
    )
    .eq('market_id', pulseId)

  if (runIdParam) {
    runQuery = runQuery.eq('id', runIdParam)
  } else {
    // Public / default path: never surface brand-pretest runs.
    runQuery = runQuery
      .eq('status', 'complete')
      .or('is_brand_pretest.eq.false,is_brand_pretest.is.null')
      .order('created_at', { ascending: false })
      .limit(1)
  }

  const { data: runRaw, error: runErr } = await runQuery.maybeSingle()

  if (runErr || !runRaw) {
    return NOT_FOUND
  }

  const run = runRaw as ReplayRunRow

  // Explicit runId must belong to this pulse and be complete (or admin peek).
  if (run.market_id !== pulseId) {
    return NOT_FOUND
  }
  if (run.status !== 'complete' && !isAdmin) {
    return NOT_FOUND
  }

  const decision = decideReplayAccess({
    isAdmin,
    includeRealParam: includeRealParam && isAdmin,
    pulseStatus: pulseRow.status,
    runRevealedAt: run.revealed_at,
    runIsFixture: run.is_fixture,
    publicClosedEnabled: isSimViewerPublicClosedEnabled(),
  })

  if (!decision.allow) {
    return NextResponse.json({ error: 'Not found' }, { status: decision.status })
  }

  // Outcomes (options) — read-only.
  const { data: outcomesRaw, error: outcomesErr } = await admin
    .from('market_outcomes')
    .select(
      'id, label, sort_order, vote_count, total_confidence, confident_pick_count',
    )
    .eq('market_id', pulseId)
    .order('sort_order', { ascending: true })

  if (outcomesErr || !outcomesRaw) {
    return NOT_FOUND
  }

  const outcomes = outcomesRaw as ReplayOutcomeRow[]

  // Single joined query for votes + personas — no N+1.
  // option_chosen / created_at / persona.id+household support legacy rows
  // (null option_id / sequence_index) via lib/sim-viewer/legacy.ts.
  const { data: votesRaw, error: votesErr } = await admin
    .from('simulation_votes')
    .select(
      `
      sequence_index,
      option_id,
      option_chosen,
      confidence,
      reasoning,
      reasoning_es,
      created_at,
      persona:simulation_personas (
        id,
        persona_key,
        alcaldia,
        colonia,
        ageb_code,
        centroid_lat,
        centroid_lng,
        nse_band,
        income_band,
        age,
        gender,
        education,
        occupation,
        household_size,
        household,
        persona_narrative,
        grounding
      )
    `,
    )
    .eq('run_id', run.id)
    .order('created_at', { ascending: true })

  if (votesErr) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const voteRows: ReplayVoteRow[] = (votesRaw ?? []).map((row) => {
    const r = row as {
      sequence_index: number | null
      option_id: string | null
      option_chosen: string | null
      confidence: number
      reasoning: string | null
      reasoning_es: string | null
      created_at: string | null
      persona: ReplayPersonaRow | ReplayPersonaRow[] | null
    }
    // Supabase may return the embed as object or single-element array
    // depending on relationship cardinality inference.
    const persona = Array.isArray(r.persona) ? (r.persona[0] ?? null) : r.persona
    return {
      sequence_index: r.sequence_index,
      option_id: r.option_id,
      option_chosen: r.option_chosen,
      confidence: r.confidence,
      reasoning: r.reasoning,
      reasoning_es: r.reasoning_es,
      created_at: r.created_at,
      persona,
    }
  })

  const pulse: ReplayPulseRow = {
    id: pulseRow.id,
    title: pulseRow.title,
    resolution_date: pulseRow.resolution_date,
    status: pulseRow.status,
  }

  const payload = buildReplayPayload({
    run,
    pulse,
    voteRows,
    outcomes,
    totalVotes: pulseRow.total_votes ?? 0,
    includeRealAggregates: decision.includeRealAggregates,
  })

  const headers: Record<string, string> = {
    'Cache-Control': decision.cachePublic ? PUBLIC_CACHE : PRIVATE_NO_STORE,
  }

  return NextResponse.json(payload, { status: 200, headers })
}
