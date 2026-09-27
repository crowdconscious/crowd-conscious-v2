import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  isSimViewerEnabled,
  isSimViewerFixtureOpen,
} from '@/lib/sim-viewer/is-enabled'
import { loadSimulationFixture } from '@/lib/sim-viewer/load-fixture'
import SimulationViewerLoader from '@/components/sim-viewer/SimulationViewerLoader'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Visor de simulación (fixture preview)',
  robots: { index: false, follow: false },
}

/**
 * Dev / local screenshot path for the fixture viewer without an admin
 * session. Requires BOTH:
 *   NEXT_PUBLIC_SIM_VIEWER_ENABLED=true
 *   and (NODE_ENV=development OR SIM_VIEWER_FIXTURE_OPEN=true)
 *
 * Production should use /admin/sim-viewer/fixture instead.
 */
export default function PulseSimViewerFixturePage() {
  if (!isSimViewerEnabled() || !isSimViewerFixtureOpen()) {
    notFound()
  }

  const data = loadSimulationFixture()

  return (
    <div className="min-h-screen bg-[#0f1419] px-3 py-6 sm:px-6 sm:py-10">
      <SimulationViewerLoader pulseId="fixture" initialData={data} />
    </div>
  )
}
