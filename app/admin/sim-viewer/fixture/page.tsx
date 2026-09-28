import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSimViewerEnabled } from '@/lib/sim-viewer-flag'
import { loadSimulationFixture } from '@/lib/sim-viewer/load-fixture'
import SimulationViewerLoader from '@/components/sim-viewer/SimulationViewerLoader'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Visor de simulación (fixture)',
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ captura?: string; persona?: string }>
}

/**
 * Admin fixture preview for the Visor de simulación.
 *
 * Auth: gated by app/admin/layout.tsx (admin only).
 * Flag: NEXT_PUBLIC_SIM_VIEWER_ENABLED=true required, else 404.
 * Capture: /admin/sim-viewer/fixture?captura=1 (admin chrome hides via CSS).
 *
 * Preview path on Vercel: /admin/sim-viewer/fixture
 */
export default async function AdminSimViewerFixturePage({ searchParams }: Props) {
  if (!isSimViewerEnabled()) {
    notFound()
  }

  const sp = await searchParams
  const data = loadSimulationFixture()

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#0a0f14]">
      <SimulationViewerLoader
        pulseId="fixture"
        initialData={data}
        captureMode={sp.captura === '1'}
        initialPersonaKey={sp.persona ?? null}
      />
    </div>
  )
}
