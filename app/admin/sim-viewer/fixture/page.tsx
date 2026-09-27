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
 * (set NEXT_PUBLIC_SIM_VIEWER_ENABLED=true on the preview deployment).
 */
export default function AdminSimViewerFixturePage() {
  if (!isSimViewerEnabled()) {
    notFound()
  }

  const data = loadSimulationFixture()

  return (
    <div className="min-h-screen bg-[#0f1419] px-3 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto mb-4 max-w-6xl">
        <h1 className="text-sm font-medium text-slate-400">
          Admin · Visor de simulación · datos de ejemplo
        </h1>
      </div>
      <SimulationViewerLoader pulseId="fixture" initialData={data} />
    </div>
  )
}
