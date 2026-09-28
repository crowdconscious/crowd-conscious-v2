import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AuthSessionExpiredError, getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { createAdminClient } from '@/lib/supabase-admin'
import { decideReplayAccess } from '@/lib/sim-viewer/access'
import {
  pickDefaultSimulationRun,
  type DefaultRunCandidate,
} from '@/lib/sim-viewer/pick-default-run'
import { isSimViewerEnabled } from '@/lib/sim-viewer-flag'
import { isSimViewerPublicClosedEnabled } from '@/lib/sim-viewer/public-closed-flag'
import SimulationViewerLoader from '@/components/sim-viewer/SimulationViewerLoader'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    captura?: string
    persona?: string
    runId?: string
    src?: string
  }>
}

/** Minimal run row for the page gate + default pick (mirrors Task 2 / PR #19). */
type RunGateRow = DefaultRunCandidate & {
  revealed_at: string | null
}

/** How many recent complete runs to scan when choosing the default (scored preferred). */
const DEFAULT_RUN_CANDIDATE_LIMIT = 50

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Visor de simulación',
    robots: { index: false, follow: false },
  }
}

async function resolveIsAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    return isAdminUser(user)
  } catch (err) {
    // Expired / invalid session → treat as anonymous (404, not 401/403).
    if (err instanceof AuthSessionExpiredError) return false
    return false
  }
}

/**
 * /pulse/[id]/simulacion — Visor de simulación (Task 3).
 *
 * Access gate uses shared `decideReplayAccess` (`lib/sim-viewer/access.ts`,
 * same module as the replay API). Denied callers always get Next.js
 * `notFound()` → HTTP 404 (never 403).
 *
 *   - Feature flag off → 404
 *   - No complete run → 404
 *   - Non-admin: only `status=resolved` + revealed_at + non-fixture +
 *     SIM_VIEWER_PUBLIC_CLOSED ≠ 'false' (default ON)
 *   - Admin: always (fixtures included)
 */
export default async function PulseSimulacionPage({ params, searchParams }: Props) {
  if (!isSimViewerEnabled()) {
    notFound()
  }

  const { id } = await params
  const sp = await searchParams

  const admin = createAdminClient()
  const { data: market } = await admin
    .from('prediction_markets')
    .select('id, title, status, resolution_date, is_pulse, category, market_type')
    .eq('id', id)
    .maybeSingle()

  if (!market) {
    notFound()
  }

  const legacyPulse =
    !market.is_pulse &&
    market.category !== 'pulse' &&
    market.market_type === 'multi' &&
    market.category === 'government'

  const showPulse =
    market.is_pulse || market.category === 'pulse' || legacyPulse

  if (!showPulse) {
    notFound()
  }

  // Explicit ?runId=, or default: most recent complete non-fixture
  // non-brand-pretest run with a stored divergence score (else newest
  // complete). `is_fixture` lands with Task 1; selecting it keeps the page
  // gate correct once that column exists. On older DBs without the column
  // the query may error — fall back to a revealed_at-only select below.
  let run: RunGateRow | null = null
  {
    const runIdParam = typeof sp.runId === 'string' ? sp.runId : null
    const gateSelect =
      'id, status, revealed_at, is_fixture, is_brand_pretest, created_at, divergence_index, divergence_meta, divergence'

    if (runIdParam) {
      const withFixtureResult = await admin
        .from('simulation_runs')
        .select(gateSelect)
        .eq('market_id', id)
        .eq('id', runIdParam)
        .maybeSingle()

      if (!withFixtureResult.error && withFixtureResult.data) {
        run = withFixtureResult.data as RunGateRow
      } else {
        const legacyResult = await admin
          .from('simulation_runs')
          .select('id, status, revealed_at, created_at, divergence_index')
          .eq('market_id', id)
          .eq('id', runIdParam)
          .maybeSingle()
        if (legacyResult.data) {
          run = {
            ...(legacyResult.data as RunGateRow),
            is_fixture: false,
            is_brand_pretest: false,
          }
        }
      }
    } else {
      const withFixtureResult = await admin
        .from('simulation_runs')
        .select(gateSelect)
        .eq('market_id', id)
        .eq('status', 'complete')
        .or('is_brand_pretest.eq.false,is_brand_pretest.is.null')
        .order('created_at', { ascending: false })
        .limit(DEFAULT_RUN_CANDIDATE_LIMIT)

      if (!withFixtureResult.error && withFixtureResult.data) {
        run = pickDefaultSimulationRun(
          withFixtureResult.data as RunGateRow[],
        )
      } else {
        const legacyResult = await admin
          .from('simulation_runs')
          .select('id, status, revealed_at, created_at, divergence_index')
          .eq('market_id', id)
          .eq('status', 'complete')
          .order('created_at', { ascending: false })
          .limit(DEFAULT_RUN_CANDIDATE_LIMIT)
        if (legacyResult.data) {
          const candidates = (legacyResult.data as RunGateRow[]).map((r) => ({
            ...r,
            is_fixture: false as boolean | null,
            is_brand_pretest: false as boolean | null,
          }))
          run = pickDefaultSimulationRun(candidates)
        }
      }
    }
  }

  if (!run) {
    notFound()
  }

  const isAdmin = await resolveIsAdmin()

  // Explicit runId must be complete for non-admins (mirrors API).
  if (run.status !== 'complete' && !isAdmin) {
    notFound()
  }

  const decision = decideReplayAccess({
    isAdmin,
    includeRealParam: false,
    pulseStatus: market.status,
    runRevealedAt: run.revealed_at,
    runIsFixture: run.is_fixture === true,
    publicClosedEnabled: isSimViewerPublicClosedEnabled(),
  })

  if (!decision.allow) {
    // Deliberate 404 — do not confirm simulation existence (never 403).
    notFound()
  }

  const fromApp = sp.src === 'app'
  const captureMode = sp.captura === '1'
  const fullBleed = fromApp || captureMode

  return (
    <div
      className={`overflow-hidden bg-[#0a0f14] ${
        fullBleed
          ? 'h-dvh max-h-dvh'
          : 'h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)]'
      }`}
      data-sim-page={fromApp ? 'app' : 'web'}
    >
      <SimulationViewerLoader
        pulseId={id}
        // Always pin the gate-selected run so the client API fetch matches
        // the page gate (and prefers the scored default when URL omitted runId).
        runId={run.id}
        captureMode={captureMode}
        initialPersonaKey={sp.persona ?? null}
      />
    </div>
  )
}
