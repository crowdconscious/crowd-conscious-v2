import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { createAdminClient } from '@/lib/supabase-admin'
import { isSimViewerEnabled } from '@/lib/sim-viewer/is-enabled'
import SimulationViewerLoader from '@/components/sim-viewer/SimulationViewerLoader'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ captura?: string; persona?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Visor de simulación',
    robots: { index: false, follow: false },
  }
}

/**
 * /pulse/[id]/simulacion — Visor de simulación (Task 3).
 *
 * Open-pulse gate (product rule): while the Pulse is open, only admins may
 * reach this page. Non-admin / anonymous get 404 (not 403) so we do not
 * confirm a simulation exists to someone who has not voted yet.
 *
 * Auth/RLS edge cases parked in the PR — see draft description.
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
    .select('id, title, status, closes_at, is_pulse, category, market_type')
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

  const closesAt = market.closes_at ? new Date(market.closes_at) : null
  const isPastClose = closesAt !== null && closesAt.getTime() < Date.now()
  const isClosed =
    market.status === 'closed' ||
    market.status === 'resolved' ||
    isPastClose
  // Treat anything not clearly closed as open for the anchoring gate.
  // Draft / other edge statuses: parked question in the PR.
  const isOpen = !isClosed

  if (isOpen) {
    const user = await getCurrentUser()
    if (!user || !isAdminUser(user)) {
      // Deliberate 404 — do not confirm simulation existence.
      notFound()
    }
  }

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#0a0f14]">
      <SimulationViewerLoader
        pulseId={id}
        captureMode={sp.captura === '1'}
        initialPersonaKey={sp.persona ?? null}
      />
    </div>
  )
}
