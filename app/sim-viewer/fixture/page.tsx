import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  isSimViewerEnabled,
  isSimViewerFixtureOpen,
} from '@/lib/sim-viewer-flag'
import { loadSimulationFixture } from '@/lib/sim-viewer/load-fixture'
import SimulationViewerLoader from '@/components/sim-viewer/SimulationViewerLoader'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Visor de simulación (fixture preview)',
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ captura?: string; persona?: string }>
}

/**
 * Standalone fixture preview — no LandingNav / Supabase chrome.
 * Capture URL: /sim-viewer/fixture?captura=1
 */
export default async function SimViewerFixturePage({ searchParams }: Props) {
  if (!isSimViewerEnabled() || !isSimViewerFixtureOpen()) {
    notFound()
  }

  const sp = await searchParams
  const data = loadSimulationFixture()

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#0a0f14] font-sans">
      <SimulationViewerLoader
        pulseId="fixture"
        initialData={data}
        captureMode={sp.captura === '1'}
        initialPersonaKey={sp.persona ?? null}
      />
    </div>
  )
}
