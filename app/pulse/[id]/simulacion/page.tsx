import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AuthSessionExpiredError, getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { createAdminClient } from '@/lib/supabase-admin'
import { decideReplayAccess } from '@/lib/sim-viewer/access'
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

/** Minimal run row for the page gate (mirrors Task 2 / PR #19). */
type RunGateRow = {
  id: string
  status: string
  revealed_at: string | null
  /** Task 1 column — absent on older schemas; treat missing as false. */
  is_fixture?: boolean | null
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const sp = await searchParams
  const fromApp = sp.src === 'app'
  return {
    title: 'Visor de simulación',
    robots: { index: false, follow: false },
    // Inside the native in-app browser the Smart App Banner is noise —
    // suppress apple-itunes-app while keeping it for normal web visitors
    // (inherited from root layout).
    ...(fromApp ? { itunes: null } : {}),
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

  // Most recent complete non-brand-pretest run — or explicit ?runId=.
  // `is_fixture` lands with Task 1; selecting it keeps the page gate correct
  // once that column exists. On older DBs without the column the query may
  // error — fall back to a revealed_at-only select below.
  let run: RunGateRow | null = null
  {
    const runIdParam = typeof sp.runId === 'string' ? sp.runId : null
    let withFixture = admin
      .from('simulation_runs')
      .select('id, status, revealed_at, is_fixture, is_brand_pretest')
      .eq('market_id', id)

    if (runIdParam) {
      withFixture = withFixture.eq('id', runIdParam)
    } else {
      withFixture = withFixture
        .eq('status', 'complete')
        .or('is_brand_pretest.eq.false,is_brand_pretest.is.null')
        .order('created_at', { ascending: false })
        .limit(1)
    }

    const withFixtureResult = await withFixture.maybeSingle()

    if (!withFixtureResult.error && withFixtureResult.data) {
      run = withFixtureResult.data as RunGateRow
    } else {
      let legacy = admin
        .from('simulation_runs')
        .select('id, status, revealed_at')
        .eq('market_id', id)
      if (runIdParam) {
        legacy = legacy.eq('id', runIdParam)
      } else {
        legacy = legacy
          .eq('status', 'complete')
          .order('created_at', { ascending: false })
          .limit(1)
      }
      const legacyResult = await legacy.maybeSingle()
      if (legacyResult.data) {
        run = { ...(legacyResult.data as RunGateRow), is_fixture: false }
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
        runId={typeof sp.runId === 'string' ? sp.runId : null}
        captureMode={captureMode}
        initialPersonaKey={sp.persona ?? null}
      />
    </div>
  )
}
