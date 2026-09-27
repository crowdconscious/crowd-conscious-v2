import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSimViewerEnabled } from '@/lib/sim-viewer/is-enabled'
import { loadSimulationFixture } from '@/lib/sim-viewer/load-fixture'
import SimulationViewerLoader from '@/components/sim-viewer/SimulationViewerLoader'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Visor de simulación (fixture)',
  robots: { index: false, follow: false },
}

/**
 * Admin fixture preview for the Visor de simulación.
 *
 * Auth: gated by app/admin/layout.tsx (admin only).
 * Flag: NEXT_PUBLIC_SIM_VIEWER_ENABLED=true required, else 404.
 *
 * Preview path on Vercel: /admin/sim-viewer/fixture
 */
export default function AdminSimViewerFixturePage() {
  if (!isSimViewerEnabled()) {
    notFound()
  }

  const data = loadSimulationFixture()

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#0a0f14]">
      <SimulationViewerLoader pulseId="fixture" initialData={data} />
    </div>
  )
}
